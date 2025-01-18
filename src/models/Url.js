import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema({
    longUrl: { type: String, required: true },
    shortUrl: { type: String, required: true, unique: true },
    customAlias: { type: String, unique: true },
    topic: { type: String },
    createdAt: { type: Date, default: Date.now },
});

const Url = mongoose.model('Url', urlSchema);

export default Url;
