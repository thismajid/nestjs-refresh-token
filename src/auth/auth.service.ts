import {
  BadRequestException,
  Inject,
  Injectable,
  CACHE_MANAGER,
} from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { Tokens } from './types/tokens.type';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import { RedisCacheService } from 'src/redis/redis.service';

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

    await this.redisService.set('' + newUser['_id'], tokens.refresh_token);

    return tokens;
  }

  async getFromCache(key: string) {
    return await this.redisService.get(key);
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
