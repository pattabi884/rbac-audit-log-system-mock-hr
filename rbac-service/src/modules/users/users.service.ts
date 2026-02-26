import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@infrastructure/database/schemas/user.schema';


@Injectable()
export class UsersService{
    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
    ){}
    //create a new user called wen registering a new user in system 
    //check for duplicate email before creating 

    async create(data: {
        email: string;
        name: string;
        passwordHash: string;
    }): Promise<UserDocument> {
        //check for email already taken for a clean error message(mongo db has a ba error response for thsi)
        const existing = await this.userModel.findOne({ email: data.email });
        if (existing){
            throw new ConflictException(`Email ${data.email} is already registered `)
        }
            const user = new this.userModel(data);
            return user.save()
    }

    async findAll(): Promise<UserDocument[]> {
        return this.userModel
        .find()
        .select('-passwordHash')
        .sort({name: 1 });
    }
    async findOne(id: string): Promise<UserDocument> {
        const user = await this.userModel
        .findById(id)
        .select('-passwordHash');

        if (!user){
            throw new NotFoundException(`User ${id} not found`);
        }
        return user;
    }
    //the login get one look up returning password hassh is required here 
    async findByEmail(email: string): Promise<UserDocument | null>{
        return this.userModel.findOne({ email });
    }
    //$set only updates the fields provided
    async update(
        id: string,
        data: Partial<{ name: string; email: string; isActive: boolean }>,
    ): Promise<UserDocument> {
        const user = await this.userModel
        .findByIdAndUpdate(
            id,
            { $set: data},
            { new: true},
        )
        .select('-passwordHash');
        
        if(!user) {
            throw new NotFoundException(`User ${id} not found`);
        }
        return user;
    }
    async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $set: { lastLoginAt: new Date() },
    });
}
async deactivate(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { returnDocument: 'after' },
      )
      .select('-passwordHash');

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

    async promoteUser(id: string): Promise<UserDocument> {
    const user = await this.findOne(id);
    // Add promotion logic here as your business needs grow
    return user;
  }
}