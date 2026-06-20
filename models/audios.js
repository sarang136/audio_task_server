const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema(
  {
    link: {
      type: String,
    },
    size: {
      type: Number,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Audio", audioSchema);
