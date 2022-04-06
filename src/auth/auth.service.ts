import {
  BadRequestException,
  Inject,
  Injectable,
  CACHE_MANAGER,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { Tokens } from './types/tokens.type';
import { JwtService } from '@nestjs/jwt';
import { RedisCacheService } from 'src/redis/redis.service';
import { hash, compare } from 'bcrypt';
import { LoginUserDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisCacheService,
  ) {}

  // async validateUser(email: string, pass: string) {
  //   const user = await this.usersService.findByEmail(email);

  //   if (!user || !user.comparePassword(pass)) return false;

  //   const { password, __v, ...result } = user.toObject();

  //   return result;
  // }

  async register(createUserDto: CreateUserDto): Promise<Tokens> {
    const { email } = createUserDto;
    const existUser = await this.usersService.findByEmail(email);
    if (existUser) throw new BadRequestException();

    const newUser = await this.usersService.create(createUserDto);

    const tokens = await this.getTokens(newUser?._id, newUser?.email);

    const hashedRefreshToken = await this.hashData(tokens.refresh_token);
    await this.redisService.set('' + newUser['_id'], hashedRefreshToken);

    return tokens;
  }

  async login(loginUserDto: LoginUserDto): Promise<Tokens> {
    const { email, password } = loginUserDto;
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.comparePassword(password))
      throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user?._id, user?.email);

    const hashedRefreshToken = await this.hashData(tokens.refresh_token);
    await this.redisService.set('' + user['_id'], hashedRefreshToken);

    return tokens;
  }

  async logout(userId: string) {
    return await this.redisService.del(userId);
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);

    if (!user) throw new ForbiddenException('Access Denied');

    const storeRefreshToken = await this.getFromCache(userId);

    const refreshTokenMatches = await this.compareData(
      refreshToken,
      storeRefreshToken,
    );

    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(userId, user?.email);

    const hashedNewRefreshToken = await this.hashData(tokens?.refresh_token);
    await this.redisService.set(userId, hashedNewRefreshToken);

    return tokens;
  }

  async getFromCache(key: string) {
    return await this.redisService.get(key);
  }

  async hashData(data: string) {
    return await hash(data, 10);
  }

  async compareData(refreshToken: string, storeRefreshToken: any) {
    return await compare(refreshToken, storeRefreshToken);
  }

  async getTokens(userId: string, email: string): Promise<Tokens> {
    const jwtPayload = {
      sub: userId,
      email: email,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: 'AT_SECRET',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: 'RT_SECRET',
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }
}
