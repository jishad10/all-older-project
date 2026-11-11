// src/core/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import User from '../entities/auth/auth.model.js';
import { googleClientId, googleClientSecret, serverUrl } from '../core/config/config.js';

passport.use(
  new GoogleStrategy(
    {
      clientID:     googleClientId,
      clientSecret: googleClientSecret,
      callbackURL:  `${serverUrl}/api/v1/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        let user = await User.findOne({ email });

        if (user) {
          // Existing user — just log them in
          return done(null, { user, isNew: false });
        }

        // New user — create a minimal record, role step comes later
        user = await User.create({
          firstName:    profile.name.givenName  || '',
          lastName:     profile.name.familyName || '',
          email,
          googleId:     profile.id,
          authProvider: 'google',
          password:     crypto.randomUUID(), // unusable placeholder
          isVerified:   true,               // Google already verified email
          accountStatus: null,
          role:          null,              // set in /complete-google
        });

        return done(null, { user, isNew: true });
      } catch (err) {
        done(err, null);
      }
    }
  )
);

export default passport;