import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { hashSync, compareSync } from 'bcrypt';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User extends Document {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  comparePassword: Function;
}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('password')) {
    const { password } = this;
    const hashedPassword = hashSync(password, 10);
    this.password = hashedPassword;
    return next();
  } else {
    return next();
  }
});

UserSchema.methods.comparePassword = function (password: string) {
  return compareSync(password, this.password);
};

UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.__v;
  delete user.password;
  return user;
};

export { UserSchema };
