import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Redirect user to Google for authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback URL
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Return the token to the user
    res.json({ token, user });
});

export default router;
