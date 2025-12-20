const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'designer'], required: true }
});

// עזר לאימות סיסמה (סטטיק על המודל)
userSchema.statics.verifyPassword = function (inputPassword, storedPassword) {
  return bcrypt.compare(inputPassword, storedPassword);
};

// אפשרות: pre-save להצפנת סיסמה אם תרצי לשמור דרך המודל ישירות
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

module.exports = mongoose.model('User', userSchema);
