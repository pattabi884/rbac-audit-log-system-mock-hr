import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '@infrastructure/database/schemas/user.schema';
import { Mongoose } from 'mongoose';
import { AuthController } from './auth.controller';
import { UserRolesModule } from '../rbac/user-roles/user-roles.module';
@Module({
    imports:[
        //Config module lets us read from .env files 
          UserRolesModule,
        ConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt'}),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
                signOptions:{
                    //how long until toekn expires
                    expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') as any
                },
            }),
        }),
        //register the schema here so the jwt strategy can qury to verify the user still exists adn is still active wen token is presented 
        MongooseModule.forFeature([
            {name: User.name, schema: UserSchema},
        ]),
    ],
    controllers: [AuthController],
    
    providers:[
        //the guard that protects the routes 
        JwtAuthGuard,
        JwtStrategy,
    ],
     exports: [JwtAuthGuard, JwtModule, PassportModule],
})
export class AuthModule {}