const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const QuestionSchema = new Schema({
    title:{
        type: String,
        max: 200,
        required: true
    },
    category: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
        ref: 'Category'
    },
    type:{
        type: String,
        required: true
    },
    text: {
        type: String,
        max: 300,
        required: true
    },
    stemBody: {
       stems: [{
           type: String, 
           maxlength: 200
        }],
        answers: [{
            type: String, 
            maxlength: 200
         }],
         feedbacks: [{
            type: String, 
            maxlength: 200
         }]
    },
    generalFeedbacks: String,
    tags: [String],
    createDate: {
        type: Date,
        default: Date.now
    },
    modifiedDate: {
        type: Date
    },
    creator: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    }    
})

module.exports = mongoose.model('Question',QuestionSchema);


