import mongoose, { Document, Schema } from 'mongoose';

export interface IMasterDataTab extends Document {
    tabId: string;
    label: string;
}

const masterDataTabSchema = new Schema<IMasterDataTab>(
    {
        tabId: { type: String, required: true, unique: true, lowercase: true, trim: true },
        label: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

export default mongoose.model<IMasterDataTab>('MasterDataTab', masterDataTabSchema);