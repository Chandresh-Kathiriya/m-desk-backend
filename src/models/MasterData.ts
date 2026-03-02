import mongoose, { Document, Schema } from 'mongoose';

export interface IMasterData extends Document {
    type: string;
    name: string;
    description?: string;
    hexCode?: string;
    code?: string;
}

const masterDataSchema = new Schema<IMasterData>(
    {
        type: { type: String, required: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        hexCode: { type: String, trim: true },
        code: { type: String, trim: true }
    },
    { timestamps: true }
);

// Prevent duplicate names WITHIN the same category (e.g., no two "Red" colors)
masterDataSchema.index({ type: 1, name: 1 }, { unique: true });

export default mongoose.model<IMasterData>('MasterData', masterDataSchema);