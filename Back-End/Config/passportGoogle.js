const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../Models/user');

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

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
