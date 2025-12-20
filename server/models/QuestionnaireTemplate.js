// models/QuestionnaireTemplate.js
const mongoose = require("mongoose");

// אפשרות אחת בתוך שאלה (עם תמונה)
const QuestionOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },      // למשל: "Modern", "Boho"
  imageUrl: { type: String, default: "" },     // URL לתמונה שהמעצבת מעלה
});

// שאלה בתוך שאלון
const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },      // טקסט השאלה, למשל: "מה הסגנון שאת הכי אוהבת?"
  multiple: { type: Boolean, default: true },  // האם אפשר לסמן כמה אופציות או רק אחת
  options: [QuestionOptionSchema],
});

// תבנית שאלון (שהמעצבת בונה פעם אחת)
const QuestionnaireTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },   // "שאלון סלון", "שאלון כללי"
    description: String,
    roomType: String,                          // "Living Room", "Bedroom", "General" וכו'
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // מי המעצבת
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "QuestionnaireTemplate",
  QuestionnaireTemplateSchema
);
