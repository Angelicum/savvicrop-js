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
									cropRatio:'fixed',
									imageData:false,
									modal:false,
									buttons: {
										rotateLeft:true,
										rotateRight:true,
										zoomIn:true,
										zoomOut:true,
										preview:true,
										load:true
									},
									labels: {drag: 'Drag &amp; Drop Your Image Here', drop: 'Drop Image Here'}
								 };
	this.options = $.extend(true, defaults, options);

	if (this.checkIncludes() == false) return;

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
	this.$el = $('[data-id="sc-binder-'+this.options.id+'"]');
	this.buildToolbar(this.$el);
	this.$dropzone = this.$el.find('.sc-drop-wrapper');
	this.$cropper = false;
	this.created = false;
	this.filename = 'tmp';
	this.$cropperCropBox = this.$el.find('.cropper-crop-box');
	this.$spinner = this.$el.find('.sc-spinner');
	this.$fileUpload = this.$el.find('.sc-file-upload');
	this.$uploadPreview = this.$el.find('.sc-upload-thumb');
	this.$fileData = this.$el.find('.sc-file-blob');
	this.$imgarea = this.$el.find('.sc-img-container');
	this.$toolbar = this.$el.find('.sc-toolbar');
	this.$previewWrap = this.$el.find('.sc-preview-wrap');
	this.$previewThumb = this.$el.find('.sc-preview-thumb');
	this.$previewCrop = this.$el.find('.sc-preview-crop');
	this.$workarea = this.$el.find('.sc-workarea');

	this.init();
};


SavviCrop.prototype.checkIncludes = function() {
  var isOkay = true;
  if (!window.jQuery) { console.log('[-] Error: jQuery is not installed.'); isOkay = false;}
  if (!$.isFunction($.fn.modal)) { console.log('[-] Error: bootstrap is not installed.'); isOkay = false;}
  return isOkay;
};

SavviCrop.onCropSubmit = function() {
	$('body').trigger('onCropSubmit');
}
SavviCrop.prototype.show = function( ele, fade ) {
	if (typeof fade === "undefined" || fade === null) {
		fade = 0;
	}
	$(ele).removeClass('cloak');
	$(ele).stop(false,true).show( fade );
};
SavviCrop.prototype.hide = function( ele, fade ) {
	if (typeof fade === "undefined" || fade === null) {
		fade = 0;
	}
	//$(ele).addClass('cloak');
	$(ele).stop(false,true).hide(fade);
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
					if (self.options.modal){
						$('#sc-modal-'+self.options.id).modal('hide');
					}
				break;
				case 'toolbar-load':
					if (self.options.modal){
						$('#sc-modal-'+self.options.id).modal('hide');
					}
					self.restart();
				break;
				case 'toolbar-zoom-in':
					self.zoom(1);
				break;
				case 'toolbar-zoom-out':
					self.zoom(-1);
				break;
			}
			if( active ){
				self.setActiveToolbar( $(this) );
			}
			self.setDragMode( 'move');
		}
	});

	var input = self.$fileUpload;
	var theFile = null;

	self.updateStatus('default',self.options.labels.drag);
	input.on({
		dragenter : function (e) {
			self.updateStatus('success',self.options.labels.drop);
		},
		dragleave : function (e) { //function for dragging out of element
			self.updateStatus('default',self.options.labels.drag);
		},
		dragover: function(e){
			e.preventDefault();
		},
		drop: function(e){
			theFile = e.originalEvent.dataTransfer.files[0] || e.target.files[0];
			self.initFile( theFile );
		},
		change: function(e){
			theFile = this.files[0];
			if (theFile){ //Fix for IE because this is triggering twice FUCK
				self.initFile( theFile );
			}
		}
	});

	if (self.options.imageData){
		self.$fileData.val(self.options.imageData);
		self.$uploadPreview.css('background-image','url("'+self.options.imageData+'")');
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
	self.updateStatus('default','Drag Image Here.');
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
	self.resetUpload();
};
SavviCrop.prototype.resetUpload = function() {
	var self = this;
	self.$fileUpload.val("");
	self.$uploadPreview.css('background-image','none');
	self.$fileData.val("");
}
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
	if ( file.type !== 'image/png' &&
			 file.type !== 'image/jpg' &&
			 file.type !== 'image/jpeg' &&
			 file.type !== 'image/gif' ){
		self.updateStatus('error','Image is the wrong filetype.');
		self.restart();
		return false;
	}


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
				self.updateStatus('error','Image is too small: (' + this.naturalWidth + 'x' + this.naturalHeight + '). Required minimum dimensions: (' + self.MIN_WIDTH.toString() + 'x' + self.MIN_HEIGHT.toString()+').');
				img = null;
				self.restart();
			}else{
				self.initCrop();
				self.$fileUpload.val("");
			}
		}
		img.src = event.target.result;
	};
	if (file){
		self.filename = file.name.substr( 0, file.name.indexOf('.') );
	}else{
		self.filename = 'untitled';
	}

	reader.readAsDataURL(file);
};
/**
When previewing, make sure to hide the crop points
*/
SavviCrop.prototype.preview = function() {
	var self = this;
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
	self.show(self.$spinner);
};
SavviCrop.prototype.initCrop = function() {
	var self = this;
	if (self.options.modal){
		$('#sc-modal-'+self.options.id).modal('show');
		$('#sc-modal-'+self.options.id).off('shown.bs.modal');
		$('#sc-modal-'+self.options.id).on('shown.bs.modal', function() {
			$(window).trigger('resize');
		});
	}
	self.updateStatus('default','Drag &amp; Drop Your Image Here.');
	self.hide(self.$dropzone);
	self.show(self.$workarea);
	self.hide('#error');
	self.show( self.$el.find('[data-action="toolbar-save"]').parent() );
	self.show( self.$el.find('[data-action="toolbar-load"]').parent() );
	self.$cropper = $('#img-crop-'+self.options.id).cropper({
		aspectRatio: self.ASPECT_RATIO, // 16 / 9,
		//checkOrientation: false,
		minCropBoxWidth: 50,
		minCropBoxHeight: 50,
		//autoCrop: true,
		//viewMode: 1,
		zoomable: true,
		autoCropArea:1,
		//minContainerWidth:100,
		//minContainerHeight:100,
		//minCanvasWidth:self.MIN_WIDTH,
		//minCanvasHeight:self.MIN_HEIGHT,
		scalable: false,
		movable: true,
		zoomOnWheel: false,
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
			//self.setData();
		},
		cropmove: function(e) {
			//self.setData();
		},
		cropend: function( e ) {
			//self.setData();
		},
		zoom: function(e){
			//self.setData();
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
	}
};
SavviCrop.prototype.cropperReady = function(img) {
	var self = this;
	self.hide( self.$spinner, 400 );
	self.$imgarea.addClass('active');
	self.show(self.$previewThumb, 400 );
	self.show(self.$toolbar, 400 );
};

SavviCrop.prototype.updateStatus = function(type,message){
	var self = this;
	var messageArea = self.$el.find('.sc-status');
	switch(type){
		case 'default':
			self.$dropzone.removeClass('error');
			self.$dropzone.removeClass('highlight');
			break;
		case 'success':
			self.$dropzone.removeClass('error');
			self.$dropzone.addClass('highlight');
			break;
		case 'error':
			self.$dropzone.addClass('error');
			self.$dropzone.removeClass('highlight');
	}
	messageArea.html(message);
}
SavviCrop.prototype.saveCropped = function(){
	var self = this;

	/* Enforce min and max image size here */
	var canvas = self.$cropper.cropper('getCroppedCanvas');
	var canvasArgs = {width:canvas.width,
										height:canvas.height};
	if( canvas.height < self.MIN_HEIGHT ){
		canvasArgs.height = self.MIN_HEIGHT;
	}
	if( canvas.width < self.MIN_WIDTH ){
		canvasArgs.width = self.MIN_WIDTH;
	}
	var canvas = self.$cropper.cropper('getCroppedCanvas',canvasArgs);
	var blob = canvas.toDataURL("image/jpeg",0.5);
	var imgArea = self.$el.find('.sc-image-area');
	self.$fileData.val(blob);
	self.destroy();
	self.$previewThumb.removeAttr('style');
	self.hide(self.$el.find('[data-action="toolbar-load"]').parent());
	self.hide(self.$el.find('[data-action="toolbar-save"]').parent());
	self.hide(self.$el.find('[data-action="toolbar-load"]').parent());
	self.hide(self.$previewWrap);
	self.hide(self.$workarea);
	self.hide(self.$toolbar);
	self.show(self.$dropzone);
	self.updateStatus('success','Image Attached');
	//imgArea.html('<img style="vertical-align:middle; display:inline-block;" height="50" src="'+blob+'" />');
	self.$fileUpload.val("");
	self.$uploadPreview.css('background-image','url("'+blob+'")');
};

SavviCrop.prototype.createElements = function(el){
	var self = this;
	var c = '';
	var m = '';
	/* Create ToolBar */
	/* dropzone */
	c += '<div data-id="sc-binder-'+self.options.id+'">';
	c += '<div class="sc-drop-wrapper">';
	c += '<div class="sc-upload-thumb"></div>';
	c += '<div class="sc-upload-gap"></div>';
	c += '<div class="sc-dropzone">';
	c += '<div class="cloak sc-spinner"><i class="fa fa-spin fa-refresh"></i></div>';
	c += '<div class="sc-dropzone-msg">';
	c += '<div class="head1"><span class="sc-image-area"></span><span class="sc-status"></span></div>';
	c += '<div class="head2"><i class="fa fa-picture-o"></i> We recommend JPG, PNG or GIF</div>';
	c += '</div>';
	c += '<div class="head3">- or -</div>';
	c += '<button class="btn"><i class="fa fa-upload"></i> Browse For Image</button>';
	c += '<input type="file" class="sc-file-upload" name="ghost-file" title="Click to upload an image.">';
	c += '<textarea style="width:1px; display:none;" class="sc-file-blob" required="'+self.options.required+'" id="'+self.options.id+'" name="'+self.options.id+'"></textarea>';
	c += '</div>';
	c += '</div>';
	c += '</div>';
	$(el).html(c);

	/* Todo: this needs to maybe go in to a modal */

	m += '<div class="sc-toolbar clearfix">';
	m += '</div>';
	m += '<div class="sc-workarea">';
	m += '<div class="sc-preview-thumb"></div>';
	m += '<div class="sc-preview-wrap cloak">';
	m += '<div class="sc-preview-crop"></div>';
	m += '</div>';
	m += '<div class="sc-img-container">';
	m += '</div>';
	m += '</div>';

	if (self.options.modal){
		n = '';
	  n += '<div id="sc-modal-'+self.options.id+'" data-id="sc-binder-'+self.options.id+'" class="modal fade '+$(el).attr('class')+'" role="dialog" data-backdrop="static" data-keyboard="false">';
	  n += '<div class="modal-dialog">';
	  n += '<div class="modal-content">';
	  n += '<div class="modal-header">';
	  n += '<button type="button" class="close" data-dismiss="modal">&times;</button>';
	  n += '<h3 class="modal-title">Image Editor</h3>';
	  n += '</div>';
	  n += '<div class="modal-body">' + m;
	  n += '</div>'; /* .modal-body */
	  n += '<div class="modal-footer">';
	  n += '<button class="btn btn-default" data-dismiss="modal">Cancel</button>';
	  n += '</div>';
	  n += '</div>';
	  n += '</div>';
	  n += '</div>';
		$('body').append(n);
	}else{
		$(el).append('<div data-id="sc-binder-'+self.options.id+'">'+m+'</div>');
	}
};

SavviCrop.prototype.buildToolbar = function(el){
	var $toolbar = $(el).find('.sc-toolbar');
	var self = this;
	var opts = self.options.buttons;
	var c = '';
	c += '<ul class="pull-left">';
	if (opts.rotateLeft){
		c += '<li><button data-action="toolbar-rotate-left" data-active="false" title="Rotate Left"><i class="fa fa-fw fa-rotate-left"></i></button></li>';
	}
	if (opts.rotateRight){
		c += '<li><button data-action="toolbar-rotate-right" data-active="false" title="Rotate Right"><i class="fa fa-fw fa-rotate-right"></i></button></li>';
	}
	if (opts.zoomIn){
		c += '<li><button data-action="toolbar-zoom-in" data-active="false" title="Zoom In"><i class="fa fa-fw fa-search-plus"></i></button></li>';
	}
	if (opts.zoomOut){
		c += '<li><button data-action="toolbar-zoom-out" data-active="false" title="Zoom Out"><i class="fa fa-fw fa-search-minus"></i></button></li>';
	}
	if (opts.preview){
		c += '<li><button data-action="toolbar-preview" data-active="false" title="Preview"><i class="fa fa-fw fa-eye"></i></button></li>';
		c += '<li class="cloak"><button data-action="toolbar-preview-close" data-active="false" title="Close Preview"><i class="fa fa-fw fa-eye-slash"></i></button></li>';
	}
	if (opts.reset){
		c += '<li><button data-action="toolbar-reset" data-active="false" title="Reset"><i class="fa fa-fw fa-ban"></i></button></li>';
	}
	c += '</ul>';
	c += '<ul class="pull-right">';
	c += '<li class="pull-right" ><button data-action="toolbar-save" data-active="false" title="Save Cropped File"><i class="fa fa-fw fa-check-circle txt-success"></i></button></li>';
	if (opts.load){
		c += '<li class="pull-right"><button data-action="toolbar-load" data-active="false" title="Edit Another File"><i class="fa fa-ban"></i></button></li>';
	}
	c += '</ul>';
	$toolbar.html(c);
	if(typeof $.fn.tooltip !== 'undefined') {
		$toolbar.find('button').each(function(){
			$(this).attr('data-placement','bottom');
			$(this).tooltip();
			$(this).on('click tap',function(){
				$(this).tooltip('hide');
			});
		});
	}
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


