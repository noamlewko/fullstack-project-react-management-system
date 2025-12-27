// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * User model
 *
 * Stores basic credentials + role.
 * Password should be saved hashed (currently hashed in the register route).
 */
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // hashed password
    role: { type: String, enum: ["client", "designer"], required: true },
  },
  { timestamps: true }
);

/**
 * Compare a plain password with a stored hash.
 * Usage: User.verifyPassword(input, user.password)
 */
UserSchema.statics.verifyPassword = function verifyPassword(inputPassword, storedPassword) {
  return bcrypt.compare(inputPassword, storedPassword);
};

// Optional: hash password in a pre-save hook if you ever save via model.save()
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

module.exports = mongoose.model("User", UserSchema);
