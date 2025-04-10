const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../Models/User');

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:9777/auth/github/callback",
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const emails = profile.emails || [];
      const primaryEmail = emails.length > 0 ? emails[0].value : null;

      // Vérifier si l'utilisateur existe par email ou githubId
      let user = await User.findOne({ $or: [{ githubId: profile.id }, { email: primaryEmail }] });

      if (!user) {
        user = new User({
          githubId: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          profileUrl: profile.profileUrl,
          role: 'student',
          email: primaryEmail,
          avatarUrl: profile.photos?.[0]?.value
        });

        await user.save();
      } else if (!user.githubId) {
        // Si l'utilisateur existe mais sans githubId, on l'associe
        user.githubId = profile.id;
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