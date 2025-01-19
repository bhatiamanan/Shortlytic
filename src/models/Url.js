import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema({
    longUrl: { type: String, required: true },
    shortUrl: { type: String, required: true, unique: true },
    customAlias: { type: String, unique: true },
    topic: { type: String },
    createdAt: { type: Date, default: Date.now },
    analytics: [
        {
            timestamp: { type: String },
            ip: { type: String },
            os: { type: String },
            device: { type: String },
            browser: { type: String },
        }
    ],
});

export default mongoose.model('Url', urlSchema);
