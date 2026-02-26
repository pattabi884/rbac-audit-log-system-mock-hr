// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '@infrastructure/database/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRolesService } from '../rbac/user-roles/user-roles.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private jwtService: JwtService,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    /*
      UserRolesService is needed for /auth/check-permission.
      It already has the hasPermission() method we built — 
      we reuse it here instead of duplicating logic.
      Make sure UserRolesModule is imported in auth.module.ts.
    */
    private userRolesService: UserRolesService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; name: string; password: string }) {
    this.logger.log(`Register attempt for email: ${body.email}`);

    const existing = await this.userModel.findOne({ email: body.email });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = new this.userModel({
      email: body.email,
      name: body.name,
      passwordHash,
    });

    const saved = await user.save();
    this.logger.log(`User registered successfully: ${saved.email}`);

    return {
      message: 'User registered successfully',
      userId: saved._id,
      email: saved.email,
      name: saved.name,
    };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) {
      this.logger.warn(`Login failed — email not found: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`Login failed — account deactivated: ${dto.email}`);
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      this.logger.warn(`Login failed — wrong password for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      loginTime: new Date(),
    };

    const token = this.jwtService.sign(payload);
    this.logger.log(`Login successful for: ${dto.email}`);

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { lastLoginAt: new Date() },
    });

    return {
      access_token: token,
      userId: user._id,
      email: user.email,
      name: user.name,
    };
  }

  /*
    GET /auth/me
    Called by hr-service JwtGuard to validate tokens.
    hr-service sends the Bearer token here and gets back
    the user payload — userId, email, name.
    This way hr-service never needs to know the JWT secret.
    JwtAuthGuard validates the token and attaches req.user
    before this method even runs.
  */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    this.logger.log(`/auth/me called for user: ${req.user.email}`);
    return {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
    };
  }

  /*
    POST /auth/check-permission
    Called by hr-service PermissionGuard on every protected request.
    Body: { permission: "employees:read" }
    Returns: { granted: true/false, userId, permission }
    
    This is the key integration point — hr-service delegates
    ALL permission logic to rbac-service. If you change a role
    in rbac-admin, it takes effect immediately in hr-service
    without any code changes.
  */
  @Post('check-permission')
  @UseGuards(JwtAuthGuard)
  async checkPermission(
    @Request() req: any,
    @Body() body: { permission: string },
  ) {
    this.logger.log(
      `Permission check: ${req.user.email} -> ${body.permission}`,
    );

    const granted = await this.userRolesService.hasPermission(
      req.user.userId,
      body.permission,
    );

    this.logger.log(
      `Permission check result: ${body.permission} -> ${granted ? 'GRANTED' : 'DENIED'}`,
    );

    return {
      granted,
      userId: req.user.userId,
      email: req.user.email,
      permission: body.permission,
    };
  }
}