/**
using FileReader API.	Modern browsers only.
IE 10+, FireFox, Chrome, Safari, iOS Safari, Chrome For Android
http://caniuse.com/#feat=filereader
*/


var SavviCrop = function(options, element, callback) {
	var callback = callback || function(){};
	var defaults = {};
	var options = $.extend(true, defaults, options);


	this.createElements(element);

	this.state = document.getElementById('status');
	this.$dropzone = $(element).find('.sc-dropzone');
	this.$cropper = false;
	this.created = false;
	this.filename = 'tmp';
	this.$imgarea = $(element).find('.sc-img-container');
	this.$help = $(element).find('.sc-help');
	this.$previewWrap = $(element).find('.sc-preview-wrap');
	this.$previewThumb = $(element).find('.sc-preview-thumb');
	this.$previewCrop = $(element).find('.sc-preview-crop');
	this.$workarea = $(element).find('.sc-workarea');
	this.UPLOAD_URL = '/image-crop';
	this.MIN_WIDTH = 320;
	this.MIN_HEIGHT = 110;
	this.CROP_DEBUG = false;
	this.CSS_TRANSITIONS = true;
	this.DRAGDROP = false;
	this.ASPECT_RATIO = 'auto';

	this.init();
};

SavviCrop.onCropSubmit = function() {
	$('body').trigger('onCropSubmit');
}
SavviCrop.prototype.isEventSupported = function( eventName, element ) {
	var TAGNAMES = {
	'select': 'input', 'change': 'input',
	'submit': 'form', 'reset': 'form',
	'error': 'img', 'load': 'img', 'abort': 'img'
	};
	element = element || document.createElement(TAGNAMES[eventName] || 'div');
	eventName = 'on' + eventName;
	// When using `setAttribute`, IE skips "unload", WebKit skips "unload" and "resize", whereas `in` "catches" those
	var isSupported = eventName in element;
	if ( !isSupported ) {
		// If it has no `setAttribute` (i.e. doesn't implement Node interface), try generic element
		if ( !element.setAttribute ) {
		element = document.createElement('div');
		}
		if ( element.setAttribute && element.removeAttribute ) {
		element.setAttribute(eventName, '');
		isSupported = typeof element[eventName] == 'function';

		// If property was created, "remove it" (by setting value to `undefined`)
		if ( typeof element[eventName] != 'undefined' ) {
			element[eventName] = undefined;
		}
		element.removeAttribute(eventName);
		}
	}
	element = null;
	return isSupported;
};
SavviCrop.prototype.show = function( ele, fade ) {
	if (typeof fade === "undefined" || fade === null) {
		fade = 0;
	}
	$(ele).removeClass('cloak');
	$(ele).show( fade );
};
SavviCrop.prototype.hide = function( ele, fade ) {
	if (typeof fade === "undefined" || fade === null) {
		fade = 0;
	}
	//$(ele).addClass('cloak');
	$(ele).hide(fade);
};
SavviCrop.prototype.error = function( msg ) {
	var self = this;
	$('.error-msg').text(msg);
	self.show('#error');
};
SavviCrop.prototype.gcd = function(a, b) {
	return (b == 0) ? a : gcd (b, a%b);
};
SavviCrop.prototype.setCropDimensions = function( w, h ){
	if( $cropper != null ){
		var e = $cropper.cropper('getData');
		var imageData = $cropper.cropper('getImageData');
		var cbd = $cropper.cropper('getCropBoxData');
		//check if rotated via exif and invert
		var rotate = Math.abs(imageData.rotate) === 90;
		var ih,iw,nh,nw,scaleX,scaleY,newHeight,newWidth;
		if( rotate ){
			ih = imageData.width;
			iw = imageData.height;
			nh = imageData.naturalWidth;
			nw = imageData.naturalHeight;
			scaleX = ih / nh;
			scaleY = iw / nw;
			newWidth = Math.round( w * scaleX );
			newHeight = Math.round( h * scaleY );
		}else{
			ih = imageData.height;
			iw = imageData.width;
			nh = imageData.naturalHeight;
			nw = imageData.naturalWidth;
			scaleX = iw / nw;
			scaleY = ih / nh;
			newWidth = Math.round( w * scaleX );
			newHeight = Math.round( h * scaleY );
		}
	}
	MIN_WIDTH = w;
	MIN_HEIGHT = h;
	var r = gcd (MIN_WIDTH, MIN_HEIGHT);
	aspectRatio = (MIN_WIDTH/r) / (MIN_HEIGHT/r);
	if( $cropper != null ){
		$cropper.cropper('setAspectRatio', aspectRatio );
		$cropper.cropper('setCropBoxData', {
			width: newWidth,
			height: newHeight,
			left: cbd.left,
			top: cbd.top
		});
	}
};
SavviCrop.prototype.init = function(){
	var self = this;
	/*
	if (window.FileReader && self.isEventSupported('dragstart') && self.isEventSupported('drop')) {
		self.DRAGDROP = true;
	}else{
		self.hide('.show-modern' );
		self.hide('.show-legacy');
		self.hide(self.$dropzone);
		self.hide('#btn-group');
		self.error( 'Please upgrade your browser' );
	}
	if(self.DRAGDROP){
		self.show('.show-modern' );
	}else{
		self.show('.show-legacy' );
		self.hide('#drop-zone-content');
	}
	if( self.CROP_DEBUG ){
		if (typeof window.FileReader === 'undefined') {
			self.state.innerHTML = 'File API & FileReader unavailable';
		} else {
			self.state.innerHTML = 'File API & FileReader available';
		}
	}
	*/

	/* Check to see if there is an image loaded first */


	$('#toolbar').on('click','button', function( e ) {
		e.preventDefault();
		if( ! $(this).attr('disable' ) ){
			var action = $(this).data('action');
			var active = $(this).data('active');
			$('#toolbar button').removeClass('active');
			switch( action ){
				case 'toolbar-move':
					self.setDragMode( 'move');
				break;
				case 'toolbar-crop':
					self.setDragMode( 'crop');
				break;
				case 'toolbar-rotate-left':
					self.rotate(-1);
				break;
				case 'toolbar-rotate-right':
					self.rotate(1);
				break;
				case 'toolbar-reset':
					self.reset();
				break;
				case 'toolbar-preview':
					self.cropPreview();
				break;
				case 'toolbar-close-preview':
					self.undoPreview();
				break;
				case 'toolbar-save':
					//show( '.cropper-point' );
					//show( '.cropper-line' );
					self.show( '.cropper-crop-box');
					self.saveCropped();
				break;
				case 'toolbar-load':
					self.restart();
				break;
				case 'toolbar-zoom-in':
					self.zoom(1);
				break;
				case 'toolbar-zoom-out':
					self.zoom(-1);
				break;
				case 'toolbar-help':
					self.showHelp();
				break;
				case 'toolbar-help-close':
					self.showHelp();
				break;
			}
			if( active ){
				self.setActiveToolbar( $(this) );
			}
			self.setDragMode( 'move');
		}
	});

	var input = self.$dropzone.find('input');

	input.on({
		dragenter : function (e) {
			self.$dropzone.addClass('highlight');
		},
		dragleave : function (e) { //function for dragging out of element
			self.$dropzone.removeClass('highlight');
		}
	});

	input.on('change', function (e) {
		var file = this.files[0] || e.target.files[0];
		self.initFile( file );
	});
	/*
	$('body').on('onCropSubmit', function() {
		var imageName = $("#image-cropped-filename").val();
		self.blockUI( 'Saving Image...' );
		$.post( "http://alexandria.dev/profile/save-photo", { profileImageName: imageName, _token: "PjYU9jgdmamGf45w2TSoP5rzzNmt4LTPu6zYShxg" }, function( data ) {
			if( data.valid == true ){
				window.location = "http://alexandria.dev/profile/photo";
			}else{
				var msg = "There was a problem saving your profile photo, please try again.";
				if( data.msg ){
					msg = data.msg;
				}
				self.error( msg );
				self.unblockUI();
			}
		}, "json");
	});
	*/
};
SavviCrop.prototype.showHelp = function() {
	var self = this;
	if( self.$help.data('active') == true ){
		self.$help.fadeOut( 400 );
		self.$help.data('active', false );
		self.hide( $('#toolbar-help-close').parent() );
		self.show( $('#toolbar-help').parent() );
		$('#toolbar-help-close').remove('active');
		$('#toolbar button').removeAttr('disabled');
	}else{
		self.$help.fadeIn( 400 );
		self.$help.data('active', true );

		self.hide( $('#toolbar-help').parent() );
		self.show( $('#toolbar-help-close').parent() );
		$('#toolbar-help-close').addClass('active');
		$('#toolbar button').not( '#toolbar-help-close' ).attr('disabled', true );

	}
};
SavviCrop.prototype.setActiveToolbar = function( ele ){
	$(ele).addClass('active');
};
SavviCrop.prototype.setDragMode = function( mode ){
	var self = this;
	self.$cropper.cropper('setDragMode', mode);
};
// add some sort of overlay and loader icon...
SavviCrop.prototype.cropReplace = function( src ){
	var self = this;
	if( self.$cropper != null ){
		//$cropper.cropper('replace', src);
		self.show( '.spinner' );
		self.$imgarea.removeClass('active');
		self.hide( '#toolbar');
		self.hide(self.$previewThumb);
		if( self.created ){
			self.destroy();
		}
		var img = new Image();
		img.id = 'img-crop';
		img.onload = function() {
			self.$imgarea.empty();
			self.$imgarea.append( img );
			if( ! self.created ){ self.created = true; }
			self.initCrop();
		}
		img.src = src;
	}
};
SavviCrop.prototype.zoom = function( dir ){
	var self = this;
	if( self.$cropper != null ){
		var amt = dir ==1 ? 0.1 : -0.1;
		self.$cropper.cropper('zoom', amt);
	}
};
/* 1 / -1 */
SavviCrop.prototype.rotate = function( dir ){
	var self = this;
	if( self.$cropper != null ){

		var degree = dir == 1 ? 90 : -90;
		self.$cropper.cropper('rotate', degree);
		/*
		var cvd = $cropper.cropper('getCanvasData');
		var image = $cropper.cropper('getImageData');
		var cd = $cropper.cropper('getContainerData');
		if( image.rotate == 90 || image.rotate == 270 ){}
		*/
		//$cropper.cropper('setCanvasData', cvd );
		//$cropper.cropper('crop');
	}
};
SavviCrop.prototype.reset = function() {
	var self = this;
	self.$cropper.cropper('reset');
	self.$previewCrop.empty();
	self.hide(self.$previewWrap);
	//show( '.cropper-point' );
	//show( '.cropper-line' );
	self.show( '.cropper-crop-box');
};
SavviCrop.prototype.restart = function() {
	var self = this;
	self.destroy();
	self.$previewThumb.removeAttr('style');
	self.hide($('toolbar-load').parent());
	self.hide($('#toolbar-save').parent());
	self.hide($('toolbar-load').parent());
	self.hide(self.$previewWrap);
	self.hide(self.$workarea);
	self.hide( '#toolbar');
	self.show(self.$dropzone);
};
SavviCrop.prototype.destroy = function() {
	var self = this;
	self.$cropper.cropper('destroy');
	$(self.$previewThumb).empty();
	$(self.$previewCrop).empty();
	self.$imgarea.empty();
	$('#toolbar button').removeAttr('disabled');
	$('#toolbar button').removeClass('active');
};
SavviCrop.prototype.undoPreview = function() {
	var self = this;
	$(self.$previewCrop).empty();
	self.hide(self.$previewWrap);
	//show( '.cropper-point' );
	//show( '.cropper-line' );
	self.show( '.cropper-crop-box');
	self.show( $('#toolbar-preview').parent() );
	//show( $('#toolbar-reset').parent() );
	self.hide( $('#toolbar-preview-close').parent() );
	$(window).off("resize.savvicrop");
	$('#toolbar button').removeAttr('disabled');
};
SavviCrop.prototype.cropPreview = function() {
	var self = this;
	self.preview();
	self.hide( $('#toolbar-preview').parent() );
	self.show( $('#toolbar-preview-close').parent() );
	$('#toolbar-preview-close').addClass('active');
	$('#toolbar button').not( '#toolbar-preview-close, #toolbar-save' ).attr('disabled', true );
};
SavviCrop.prototype.initFile = function(file) {
	var self = this;
	var reader = new FileReader();
	self.preInitCrop();
	reader.onload = function (event) {
		var img = new Image();
		img.id = 'img-crop';
		img.onload = function() {
			if( self.created ){
				self.destroy();
			}
			self.$imgarea.append( img );
			if( !self.created ){
				self.created = true;
			}
			self.initCrop();
			if( this.naturalWidth < self.MIN_WIDTH || this.naturalHeight < self.MIN_HEIGHT ){
				//alert("Image Is Waaaay Too Small Man");
				self.error( 'The image is too small (' + this.naturalWidth + 'x' + this.naturalHeight + '). Minimum required dimensions are ' + self.MIN_WIDTH.toString() + 'x' + self.MIN_HEIGHT.toString());
				img = null;
				self.restart();
			}
		}
		img.src = event.target.result;
	};
	self.filename = file.name.substr( 0, file.name.indexOf('.') );
	reader.readAsDataURL(file);
};
/**
When previewing, make sure to hide the crop points
*/
SavviCrop.prototype.preview = function() {
	var self = this;
	var containerHeight = $(self.$workarea).height();
	var containerWidth = $(self.$workarea).width();
	var blob = self.$cropper.cropper('getCroppedCanvas').toDataURL("image/jpeg",0.9);
	var img = new Image();
	img.id = 'img-pv';
	img.onload = function() {
		self.centerPreview();
		self.previewResize();
	}
	img.src = blob;
	self.$previewCrop.append( img );
	self.show(self.$previewWrap);
	self.hide( '.cropper-crop-box');
};
SavviCrop.prototype.previewResize = function() {
	var self = this;
	$(window).on("resize.savvicrop",(function() {
		self.centerPreview();
	}));
};
SavviCrop.prototype.centerPreview = function() {
	var containerHeight = $(self.$workarea).height();
	var containerWidth = $(self.$workarea).width();
	var imgH = self.$previewCrop.find('img').height();
	self.$previewCrop.css( {
		top: ( containerHeight / 2 ) - ( imgH / 2 )
	});
};
SavviCrop.prototype.preInitCrop = function() {
	var self = this;
	self.hide(self.$dropzone);
	self.show( '.spinner');
	self.show(self.$workarea);
};
SavviCrop.prototype.initCrop = function() {
	var self = this;
	self.hide(self.$dropzone);
	self.show(self.$workarea);
	self.hide('#error');
	self.show( $('#toolbar-save').parent() );
	self.show( $('toolbar-load').parent() );
	self.$cropper = $('#img-crop').cropper({
		aspectRatio: self.ASPECT_RATIO, // 16 / 9,
		//checkOrientation: false,
		//minCropBoxWidth: 500,
		//minCropBoxHeight: 300,
		//autoCrop: false,
		//viewMode: 1,
		zoomable: true,
		minContainerWidth:300,
		minContainerHeight:300,
		minCanvasWidth:300,
		minCanvasHeight:300,
		scalable: false,
		movable: true,
		//preview:'.preview-thumb, .preview-crop',
		preview:self.$previewThumb,
		build: function(e) {
			self.undoPreview();
		},
		built: function() {
			var isLoaded = $('.cropper-canvas img').get(0).naturalWidth > 0 ? true : false;
			if( isLoaded ){
				self.cropperReady();
			}else{
				$('.cropper-canvas img').one("load", function() {
					self.cropperReady();
				});
			}
			self.setDragMode( 'move');
		},
		cropmove: function(e) {
			self.setData();
		},
		// double up on crop end
		cropend: function( e ) {
			self.setData();
		}
	});
};
SavviCrop.prototype.cropperReady = function() {
	var self = this;
	self.hide( '.spinner', 400 );
	self.$imgarea.addClass('active');
	self.show(self.$previewThumb, 400 );
	self.$cropper.cropper('setData',	{
		width:self.MIN_WIDTH,
		height:self.MIN_HEIGHT
	});
	//$('#toolbar').fadeIn( 400 );
	self.show( '#toolbar', 400 );
};
SavviCrop.prototype.setData = function() {
	var self = this;
	if(self.ASPECT_RATIO != 'auto'){
		var data = self.$cropper.cropper('getData', true);
		if( data.height < self.MIN_HEIGHT ){
			data.height = self.MIN_HEIGHT;
		}
		if( data.width < self.MIN_WIDTH ){
			data.width = self.MIN_WIDTH;
		}
		self.$cropper.cropper('setData', data );
	}
};
SavviCrop.prototype.saveCropped = function(){
	var self = this;
	var blob = self.$cropper.cropper('getCroppedCanvas').toDataURL("image/jpeg",0.9);

};
SavviCrop.prototype.uploadCropped = function() {
	/* Revisit this function later. For now we just wanna save to a field */
	/*
	var self = this;
	var formData = new FormData();
	// Upload cropped image data to server, base64 encoded as jpeg
	var blob = self.$cropper.cropper('getCroppedCanvas').toDataURL("image/jpeg",0.9);
	//strip header
	blob = blob.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
	self.hide('#error');
	formData.append('croppedImage', blob);
	formData.append('filename', filename );
	formData.append('filewidth', self.MIN_WIDTH );
	formData.append('fileheight', self.MIN_HEIGHT );
	formData.append('_token', $("#_token").val() );

	$("#image-cropped-filename").val('');
	self.blockUI( 'Uploading Image...' );
	$.ajax({
		url: self.UPLOAD_URL,
		method: "POST",
		data: formData,
		processData: false,
		contentType: false,
		dataType:'json',
		success: function (data) {
			if( data.valid == true ){
				$("#image-cropped-filename").val(data.imageName);
				self.undoPreview();
				self.unblockUI();
				self.onCropSubmit();
			}else{
				var msg = "There was a problem, please contact support";
				if( data.msg ){
					msg = data.msg;
				}
				self.error( msg );
				self.unblockUI();
			}
			// clear out and start over?
		},
		error: function () {
			console.log('Upload error');
			var msg = "There was a problem, please contact support";
			self.error( msg );
			self.undoPreview();
			self.unblockUI();
		}
	});
	*/
};
SavviCrop.prototype.blockUI = function( message ){
	$.blockUI({
		fadeOut:	400,
		fadeIn: 200,
		baseZ: 99999,
		message: message,
		css: {
			border: 'none',
			padding: '15px',
			backgroundColor: '#000',
			'-webkit-border-radius': '5px',
			'-moz-border-radius': '5px',
			'border-radius': '5px',
			opacity: .5,
			color: '#fff'
	 }
	});
};
SavviCrop.prototype.unblockUI = function() {
	$.unblockUI();
};
SavviCrop.prototype.createElements = function(el){

var c = '';

/* Create ToolBar */
c += '<div class="spinner cloak"></div>';
c += '<div id="status"></div>';
c += '<div id="toolbar" class="clearfix">';
c += '<ul class="pull-left">';
c += '<li><button data-action="toolbar-rotate-left" data-active="false" title="Rotate Left"><i class="fa fa-fw fa-rotate-left"></i></button></li>';
c += '<li><button data-action="toolbar-rotate-right" data-active="false" title="Rotate Right"><i class="fa fa-fw fa-rotate-right"></i></button></li>';
c += '<li><button data-action="toolbar-zoom-in" data-active="false" title="Zoom In"><i class="fa fa-fw fa-search-plus"></i></button></li>';
c += '<li><button data-action="toolbar-zoom-out" data-active="false" title="Zoom Out"><i class="fa fa-fw fa-search-minus"></i></button></li>';
c += '<li><button data-action="toolbar-preview" id="toolbar-preview" data-active="false" title="Preview"><i class="fa fa-fw fa-eye"></i></button></li>';
c += '<li class="cloak"><button id="toolbar-preview-close" data-action="toolbar-close-preview" data-active="false" title="Close Preview"><i class="fa fa-fw fa-eye-slash"></i></button></li>';
c += '<li><button data-action="toolbar-reset" id="toolbar-reset" data-active="false" title="Reset"><i class="fa fa-fw fa-ban"></i></button></li>';
c += '</ul>';
c += '<ul class="pull-right">';
c += '<li class="pull-right" ><button data-action="toolbar-save" id="toolbar-save" data-active="false" title="Save Cropped File"><i class="fa fa-fw fa-check-circle txt-success"></i></button></li>';
c += '<li class="pull-right"><button data-action="toolbar-load" id="toolbar-load" data-active="false" title="Edit Another File"><i class="fa fa-fw fa-image"></i></button></li>';
c += '<li class="pull-right"><button data-action="toolbar-help" id="toolbar-help" data-active="false" title="Help"><i class="fa fa-fw fa-question-circle"></i></button></li>';
c += '<li class="pull-right cloak"><button data-action="toolbar-help-close" id="toolbar-help-close" data-active="false" title="Close"><i class="fa fa-fw fa-times-circle"></i></button></li>';
c += '</ul>';
c += '</div>';

/* dropzone */
c += '<div class="sc-dropzone">';
c += '<div class="sc-dropzone-msg">';
c += '<h1><i class="fa fa-arrow-circle-o-down"></i> Drag Image Here.</h1>';
c += '<input type="file" id="file" name="file" multiple>';
c += '</div>';
c += '</div>';

c += '<div class="sc-workarea">';
c += '<div class="sc-help">';
c += '<ul>';
c += '<li><i class="fa fa-fw fa-rotate-left"></i> Rotate Image Left</li>';
c += '<li><i class="fa fa-fw fa-rotate-right"></i> Rotate Image Right</li>';
c += '<li><i class="fa fa-fw fa-search-plus"></i> Zoom In</li>';
c += '<li><i class="fa fa-fw fa-search-minus"></i> Zoom Out</li>';
c += '<li><i class="fa fa-fw fa-eye"></i> Preview Crop</li>';
c += '<li><i class="fa fa-fw fa-eye-slash"></i> Close Preview</li>';
c += '<li><i class="fa fa-fw fa-ban"></i> Reset Crop</li>';
c += '<li><i class="fa fa-fw fa-check-circle txt-success"></i> Save Cropped Image</li>';
c += '<li><i class="fa fa-fw fa-image"></i> Edit Another File</li>';
c += '</ul>';
c += '</div>';
c += '<div class="sc-preview-thumb"></div>';
c += '<div class="sc-preview-wrap cloak">';
c += '<div class="sc-preview-crop"></div>';
c += '</div>';
c += '<div class="sc-img-container">';
c += '</div>';
c += '</div>';

$(el).html(c);

};
/* Turn that dingle into a jquery plugin */
(function($) {
	$.fn.savviCrop = function(options,callback) {
		this.each(function() {
			var savviCrop = new SavviCrop(options, this, callback);
			return savviCrop;
		});
	};
})(jQuery);

$( document ).ready(function() {
	var args = {
		cropDimensions:[200,200]
	}
	$('.savvi-crop').savviCrop(args);

});
