const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    parentId: {
        type: mongoose.SchemaTypes.ObjectId
    },
    name: {
        type: String,
        required: true
    },
     slug: {
         type: String,
         required: true
     },
     catDescribe:{
         type:String,
         required: true,
         maxlength: 300
     },
     imageUrl: String,
     order: {
         type: Number,
         default: 100,
     }
})
// // validation mongoose
// const ValidationSchema = new Schema({
//     name: { // string type mongoose builtin validator 
//         type: String, 
//         required: true,
//         minlength: 10,
//         maxlength: 250,
//         //lowercase: true,
//         //uppercase: true,
//         trim: true,
//         //match: /pattern/
//     },
//     category: {
//         type: String,
//         enum: ["web","mobile"] // valid if category is within this values
//     },
//     isPublished: {type: Boolean, required: true},
//     price: {type: Number,
//         required: function (v) {return this.isPublished}, // dependent mongoose validation process
//         min: 10,
//         max: 100

//     },
//     tags: { // example of applying custom validator
//         type: Array,
//         validate: {
//             validator: function(v){
//                 return v && v.length > 0
//             },
//             message: 'A course tag should be provided '
//         }
//     },
//     asyncTags: { // example of applying custom validator of async fashion
//         isAsync: true,
//         type: Array,
//         validate: {
//             validator: function(v,callback){
//                 const result =  v && v.length > 0;
//                 callback(result);
//             },
//             message: 'A course tag should be provided '
//         }
//     }
// })


module.exports = mongoose.model('Category',CategorySchema);