import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@infrastructure/database/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt'){
    constructor(
        private configService: ConfigService,
        //inject the user model her so the query Mongo and verify te user exists 
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,

    ){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
            });
    }
    async validate(payload: {userId: string, email: string }){
        //look up the user id
        const user = await this.userModel.findById(payload.userId);
        if (!user){
            throw new UnauthorizedException('user no longer exists');
        }
        if(!user.isActive){
            throw new UnauthorizedException('user account is deactivated')
        }
        return{
            userId: payload.userId,
            email: payload.email,
            name: user.name,
            isActive: user.isActive
        };
    }


}