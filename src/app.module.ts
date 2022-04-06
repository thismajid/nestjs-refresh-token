import { CacheModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/refreshtoken'),
    UsersModule,
    AuthModule,
    CacheModule.register({ isGlobal: true }),
  ],
})
export class AppModule {}
