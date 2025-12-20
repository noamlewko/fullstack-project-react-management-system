// models/Project.js
const mongoose = require('mongoose');

/* ---------- Workers & Suppliers ---------- */

const WorkerSchema = new mongoose.Schema(
  {
    workerName: String,
    role: String,
    phone: String,
    cost: Number,
    description: String,
  },
  { _id: true }
);

const SupplierSchema = new mongoose.Schema(
  {
    storeName: String,
    supplierName: String,
    product: String,
    price: { type: Number, default: 0 },
    contactName: String,
    phone: String,
  },
  { _id: true }
);

/* ---------- Questionnaire answers (NEW STRUCTURE) ---------- */
/**
 * תשובה לשאלה אחת בשאלון של הפרויקט
 */
const QuestionnaireAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      default: '',
    },
    selectedOptions: [
      {
        optionId: { type: String, default: '' },
        name: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
      },
    ],
    freeText: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

/* ---------- Questionnaire instance on a project ---------- */

const ProjectQuestionnaireSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionnaireTemplate',
      required: true,
    },
    title: String,
    description: String,
    roomType: String,

    // צילום של השאלות מהתבנית בזמן ה-assign
    questions: [
      {
        text: String,
        multiple: { type: Boolean, default: true },
        options: [
          {
            text: String,
            imageUrl: String,
          },
        ],
      },
    ],

    // תשובות הלקוח בפורמט החדש
    answers: [QuestionnaireAnswerSchema],
  },
  { _id: true }
);

/* ---------- Color & Material selections ---------- */

const ColorSelectionSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true }, // "Living room", "Bedroom" וכו'
    wallColor: { type: String, default: '' },   // "#ffffff"
    furnitureColor: { type: String, default: '' },
    floorColor: { type: String, default: '' },
    materialType: { type: String, default: '' }, // "wood" / "metal" וכו'
    finishType: { type: String, default: '' },   // "matte" / "glossy" / "satin"
  },
  { _id: false }
);

/* ---------- Project ---------- */

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: Date,
    endDate: Date,
    budget: Number,
    clientUsername: { type: String, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    associatedClients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    workers: [WorkerSchema],
    suppliers: [SupplierSchema],

    designPlan: { type: String, default: '' },
    notes: { type: String, default: '' },

    // שאלונים לפרויקט
    designQuestionnaires: [ProjectQuestionnaireSchema],

    // ✅ בחירות צבעים וחומרים לכל חדר בפרויקט
    colorSelections: {
      type: [ColorSelectionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
