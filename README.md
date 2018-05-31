# SavviCrop.js
The Cropping Tool for Sweaty Big Men 🍒.

## 1. Required Libraries
```javascript
{
  "bootstrap": "^3.3.7",
  "cropper": "^2.3.4",
  "font-awesome": "^4.7.0",
  "jquery": "^3.1.1"
}
```
## 2. Setup
```javascript
var args = {
  required:false,
  minCropSize:[200,200],
  id: 'real-file',
  name: false,
  cropRatio:'fixed',
  imageData:false,
  modal:false,
  editor:true,
  imageQuality:'1',
  buttons: {
    rotateLeft:true,
    rotateRight:true,
    zoomIn:true,
    zoomOut:true,
    preview:true,
    load:true
  },
  maxOutputSize:[1200,1200],
  labels: {drag: 'Drag &amp; Drop Your Image Here', drop: 'Drop Image Here'}
};
$('#some-blank-element').savviCrop(args);
```
## 3. Exponsed Methods
```javascript
$('#some-blank-element').savviCrop('reset'); /* Reset the cropper from afar */
```
