const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../Models/User');

// Only initialize Google strategy if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          // Vérifier si l'utilisateur existe déjà par googleId ou email
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email: email }] });

          if (!user) {
            user = new User({
              googleId: profile.id,
              username: profile.displayName,
              email: email,
              role: 'student',
              avatarUrl: profile.photos?.[0]?.value
            });
            await user.save();
          } else if (!user.googleId) {
            // Si l'utilisateur existe mais sans googleId, on l'associe
            user.googleId = profile.id;
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
  ));
} else {
  console.log('Google OAuth credentials not found. Google authentication will not be available.');
}

// No need to repeat serializeUser and deserializeUser as they're defined in passportConfig.js