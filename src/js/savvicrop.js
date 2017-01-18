/**
using FileReader API.	Modern browsers only.
IE 10+, FireFox, Chrome, Safari, iOS Safari, Chrome For Android
http://caniuse.com/#feat=filereader
*/


var SavviCrop = function(options, element, callback) {
	var callback = callback || function(){};
	var defaults = {required:false,
									minCropSize:[200,200],
									id: 'real-file',
									cropRatio:'auto'
								 };
	this.options = $.extend(true, defaults, options);

	this.UPLOAD_URL = '/image-crop';
	this.MIN_WIDTH = this.options.minCropSize[0];
	this.MIN_HEIGHT = this.options.minCropSize[1];
	this.CROP_DEBUG = false;
	this.CSS_TRANSITIONS = true;
	this.DRAGDROP = false;
	this.ASPECT_RATIO = 'auto';

	if(this.options.cropRatio == 'fixed'){
		this.ASPECT_RATIO = (this.MIN_WIDTH / this.MIN_HEIGHT);
	}

	this.createElements(element);

	this.$el = $(element);
	this.$dropzone = $(element).find('.sc-dropzone');
	this.$cropper = false;
	this.created = false;
	this.filename = 'tmp';
	this.$cropperCropBox = $(element).find('.cropper-crop-box');
	this.$spinner = $(element).find('.sc-spinner');
	this.$status = $(element).find('.sc-status');
	this.$fileUpload = $(element).find('.sc-file-upload');
	this.$fileData = $(element).find('.sc-file-blob');
	this.$imgarea = $(element).find('.sc-img-container');
	this.$help = $(element).find('.sc-help');
	this.$toolbar = $(element).find('.sc-toolbar');
	this.$previewWrap = $(element).find('.sc-preview-wrap');
	this.$previewThumb = $(element).find('.sc-preview-thumb');
	this.$previewCrop = $(element).find('.sc-preview-crop');
	this.$workarea = $(element).find('.sc-workarea');

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

	self.$toolbar.on('click','button', function( e ) {
		e.preventDefault();
		if( ! $(this).attr('disable' ) ){
			var action = $(this).data('action');
			var active = $(this).data('active');
			self.$toolbar.find('button').removeClass('active');
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
				case 'toolbar-preview-close':
					self.undoPreview();
				break;
				case 'toolbar-save':
					//show( '.cropper-point' );
					//show( '.cropper-line' );
					self.show( self.$cropperCropBox);
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

	var input = self.$fileUpload;

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
};
SavviCrop.prototype.showHelp = function() {
	var self = this;
	if( self.$help.data('active') == true ){
		self.$help.fadeOut( 400 );
		self.$help.data('active', false );
		self.hide( self.$el.find('[data-action="toolbar-help-close"]').parent() );
		self.show( self.$el.find('[data-action="toolbar-help"]').parent() );
		self.$el.find('[data-action="toolbar-help-close"]').remove('active');
		self.$toolbar.find('button').removeAttr('disabled');
	}else{
		self.$help.fadeIn( 400 );
		self.$help.data('active', true );

		self.hide( self.$el.find('[data-action="toolbar-help"]').parent() );
		self.show( self.$el.find('[data-action="toolbar-help-close"]').parent() );
		self.$el.find('[data-action="toolbar-help-close"]').addClass('active');
		self.$toolbar.find('button').not('[data-action="toolbar-help-close"]').attr('disabled', true );

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
		self.show(self.$spinner);
		self.$imgarea.removeClass('active');
		self.hide(self.$toolbar);
		self.hide(self.$previewThumb);
		if( self.created ){
			self.destroy();
		}
		var img = new Image();
		img.id = 'img-crop-'+self.options.id;
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
	self.show( self.$cropperCropBox);
};
SavviCrop.prototype.restart = function() {
	var self = this;
	self.destroy();
	self.$previewThumb.removeAttr('style');
	self.hide(self.$el.find('[data-action="toolbar-load"]').parent());
	self.hide(self.$el.find('[data-action="toolbar-save"]').parent());
	self.hide(self.$el.find('[data-action="toolbar-load"]').parent());
	self.hide(self.$previewWrap);
	self.hide(self.$workarea);
	self.hide(self.$toolbar);
	self.$spinner.fadeOut(100);
	self.show(self.$dropzone);
	self.$status.html('Drag Image Here.');
	self.$fileUpload.val("");
	self.$dropzone.removeClass('highlight');
};
SavviCrop.prototype.destroy = function() {
	var self = this;
	if (self.$cropper.cropper){
		self.$cropper.cropper('destroy');
	}
	$(self.$previewThumb).empty();
	$(self.$previewCrop).empty();
	self.$imgarea.empty();
	self.$toolbar.find('button').removeAttr('disabled');
	self.$toolbar.find('button').removeClass('active');
};
SavviCrop.prototype.undoPreview = function() {
	var self = this;
	$(self.$previewCrop).empty();
	self.hide(self.$previewWrap);
	//show( '.cropper-point' );
	//show( '.cropper-line' );
	self.show( self.$cropperCropBox);
	self.show(self.$el.find('[data-action="toolbar-preview"]').parent() );
	//show( $('#toolbar-reset').parent() );
	self.hide(self.$el.find('[data-action="toolbar-preview-close"]').parent() );
	$(window).off("resize.savvicrop");
	self.$toolbar.find('button').removeAttr('disabled');
};
SavviCrop.prototype.cropPreview = function() {
	var self = this;
	self.preview();
	self.hide( self.$el.find('[data-action="toolbar-preview"]').parent() );
	self.show( self.$el.find('[data-action="toolbar-preview-close"]').parent() );
	self.$el.find('[data-action="toolbar-preview-close"]').addClass('active');
	self.$toolbar.find('button').not('[data-action="toolbar-preview-close"], [data-action="toolbar-save"]').attr('disabled', true );
};
SavviCrop.prototype.initFile = function(file) {
	var self = this;
	var reader = new FileReader();
	self.preInitCrop();
	reader.onload = function (event) {
		var img = new Image();
		img.id = 'img-crop-'+self.options.id;
		img.onload = function() {
			if( self.created ){
				self.destroy();
			}
			self.$imgarea.append( img );
			if( !self.created ){
				self.created = true;
			}
			if( this.naturalWidth < self.MIN_WIDTH || this.naturalHeight < self.MIN_HEIGHT ){
				//alert("Image Is Waaaay Too Small Man");
				self.error( 'The image is too small (' + this.naturalWidth + 'x' + this.naturalHeight + '). Minimum required dimensions are ' + self.MIN_WIDTH.toString() + 'x' + self.MIN_HEIGHT.toString());
				img = null;
				self.restart();
			}else{
				self.initCrop();
				self.$fileUpload.val("");
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
	self.hide( self.$cropperCropBox);
};
SavviCrop.prototype.previewResize = function() {
	var self = this;
	$(window).on("resize.savvicrop",(function() {
		self.centerPreview();
	}));
};
SavviCrop.prototype.centerPreview = function() {
	var self = this;
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
	self.show(self.$spinner);
	self.show(self.$workarea);
};
SavviCrop.prototype.initCrop = function() {
	var self = this;
	self.hide(self.$dropzone);
	self.show(self.$workarea);
	self.hide('#error');
	self.show( self.$el.find('[data-action="toolbar-save"]').parent() );
	self.show( self.$el.find('[data-action="toolbar-load"]').parent() );
	self.$cropper = $('#img-crop-'+self.options.id).cropper({
		aspectRatio: self.ASPECT_RATIO, // 16 / 9,
		//checkOrientation: false,
		//minCropBoxWidth: self.MIN_WIDTH,
		//minCropBoxHeight: self.MIN_HEIGHT,
		//autoCrop: true,
		//viewMode: 1,
		zoomable: true,
		autoCropArea:1,
		minContainerWidth:100,
		minContainerHeight:100,
		minCanvasWidth:self.MIN_WIDTH,
		minCanvasHeight:self.MIN_HEIGHT,
		scalable: false,
		movable: true,
		//preview:'.preview-thumb, .preview-crop',
		preview:self.$previewThumb,
		restore:false,
		build: function(e) {

			self.undoPreview();
		},
		built: function() {
			var img = self.$el.find('.cropper-canvas img').get(0);
			var isLoaded = img.naturalWidth > 0 ? true : false;
			if( isLoaded ){
				self.cropperReady(img);
			}else{
				self.$el.find('.cropper-canvas img').one("load", function() {
					img = self.$el.find('.cropper-canvas img').get(0);
					self.cropperReady(img);
				});
			}

			self.setDragMode( 'move');
		},
		cropstart: function(e){
			self.setData();
		},
		cropmove: function(e) {
			self.setData();
		},
		cropend: function( e ) {
			self.setData();
		},
		zoom: function(e){
			self.setData();
		}
	});
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
		console.log(data.width,data.height);
	}
};
SavviCrop.prototype.cropperReady = function(img) {
	var self = this;
	self.hide( self.$spinner, 400 );
	self.$imgarea.addClass('active');
	self.show(self.$previewThumb, 400 );
	self.show(self.$toolbar, 400 );
};
SavviCrop.prototype.saveCropped = function(){
	var self = this;
	var blob = self.$cropper.cropper('getCroppedCanvas').toDataURL("image/jpeg",0.9);
	this.$fileData.val(blob);
	self.destroy();
	self.$previewThumb.removeAttr('style');
	self.hide(self.$el.find('[data-action="toolbar-load"]').parent());
	self.hide(self.$el.find('[data-action="toolbar-save"]').parent());
	self.hide(self.$el.find('[data-action="toolbar-load"]').parent());
	self.hide(self.$previewWrap);
	self.hide(self.$workarea);
	self.hide(self.$toolbar);
	self.show(self.$dropzone);
	self.$status.html('Image Attached');
	self.$fileUpload.val("");
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
	var self = this;

var c = '';

/* Create ToolBar */
c += '<div class="sc-toolbar clearfix">';
c += '<ul class="pull-left">';
c += '<li><button data-action="toolbar-rotate-left" data-active="false" title="Rotate Left"><i class="fa fa-fw fa-rotate-left"></i></button></li>';
c += '<li><button data-action="toolbar-rotate-right" data-active="false" title="Rotate Right"><i class="fa fa-fw fa-rotate-right"></i></button></li>';
c += '<li><button data-action="toolbar-zoom-in" data-active="false" title="Zoom In"><i class="fa fa-fw fa-search-plus"></i></button></li>';
c += '<li><button data-action="toolbar-zoom-out" data-active="false" title="Zoom Out"><i class="fa fa-fw fa-search-minus"></i></button></li>';
c += '<li><button data-action="toolbar-preview" data-active="false" title="Preview"><i class="fa fa-fw fa-eye"></i></button></li>';
c += '<li class="cloak"><button data-action="toolbar-preview-close" data-active="false" title="Close Preview"><i class="fa fa-fw fa-eye-slash"></i></button></li>';
c += '<li><button data-action="toolbar-reset" data-active="false" title="Reset"><i class="fa fa-fw fa-ban"></i></button></li>';
c += '</ul>';
c += '<ul class="pull-right">';
c += '<li class="pull-right" ><button data-action="toolbar-save" data-active="false" title="Save Cropped File"><i class="fa fa-fw fa-check-circle txt-success"></i></button></li>';
c += '<li class="pull-right"><button data-action="toolbar-load" data-active="false" title="Edit Another File"><i class="fa fa-fw fa-image"></i></button></li>';
c += '<li class="pull-right"><button data-action="toolbar-help" data-active="false" title="Help"><i class="fa fa-fw fa-info-circle"></i></button></li>';
c += '<li class="pull-right cloak"><button data-action="toolbar-help-close" data-active="false" title="Close"><i class="fa fa-fw fa-times-circle"></i></button></li>';
c += '</ul>';
c += '</div>';

/* dropzone */
c += '<div class="sc-dropzone">';
c += '<div class="cloak sc-spinner"><i class="fa fa-spin fa-refresh"></i></div>';
c += '<div class="sc-dropzone-msg">';
c += '<h1><i class="fa fa-arrow-circle-o-down"></i><span class="sc-status">Drag Image Here.</span></h1>';
c += '<input type="file" class="sc-file-upload" name="ghost-file" readonly="readonly">';
c += '<input type="text" style="width:1px;" class="sc-file-blob" required="'+self.options.required+'" id="'+self.options.id+'" name="'+self.options.id+'">';
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


