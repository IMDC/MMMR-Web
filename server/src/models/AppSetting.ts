import mongoose, { Schema, Document } from 'mongoose';

export interface IAppSetting extends Document {
  key: string;
  value: string;
}

const AppSettingSchema = new Schema<IAppSetting>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

export const AppSetting = mongoose.model<IAppSetting>('AppSetting', AppSettingSchema);
