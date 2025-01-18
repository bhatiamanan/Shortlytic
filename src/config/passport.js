import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import fs from 'fs';

const credentials = JSON.parse(
    fs.readFileSync(new URL('./credentials.json', import.meta.url), 'utf-8')
);


passport.use(new GoogleStrategy({
    clientID: credentials.web.client_id, // Read from the JSON file
    clientSecret: credentials.web.client_secret, // Read from the JSON file
    callbackURL: credentials.web.redirect_uris[0], // Use the first redirect URI
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
            });
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
