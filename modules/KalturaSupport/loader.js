/**
 * kSupport module
 *  
 * Add support for kaltura api calls
 */
// Scope everything in "mw" ( keeps the global namespace clean ) 

( function( mw ) {

	// For now just store the keys in the javascript  
	// ( need to get clarity on why this is even needed )
	mw.setDefaultConfig( {		
		'Kaltura.EnableAnalytics' : true,
		'Kaltura.ServiceUrl' : 'http://www.kaltura.com',
		'Kaltura.ServiceBase' : '/api_v3/index.php?service=',
		'Kaltura.CdnUrl' : 'http://cdn.kaltura.com',
		'Kaltura.xmlProxyUrl' : mw.getMwEmbedPath() + 'modules/KalturaSupport/simplePhpXMLProxy.php'
	} );
	
	// Add the kentryid and kpartnerid and kuiconfid attribute to the embed player
	mw.setConfig( 'EmbedPlayer.Attributes', {
		'kentryid' : null,
		'kwidgetid' : null,
		'kuiconfid' : null
	});
	
	mw.setConfig( 'EmbedPlayer.DataAttributes', {		
		'kuiconf' : null
	});
	
	mw.addResourcePaths( {
		"mw.KWidgetSupport" : "mw.KWidgetSupport.js",
		"mw.KAnalytics" : "mw.KAnalytics.js",
		"mw.PlaylistHandlerKaltura"	: "mw.PlaylistHandlerKaltura.js", 
		"mw.PlaylistHandlerKalturaRss" : "mw.PlaylistHandlerKalturaRss.js",
		"mw.KDPMapping" : "mw.KDPMapping.js",		
		
		"mw.MobileAdTimeline" : "mw.MobileAdTimeline.js",		
		"mw.KAds" : "mw.KAds.js", 
		
		"KalturaClientBase"	: "kalturaJsClient/KalturaClientBase.js",
		"KalturaClient" : "kalturaJsClient/KalturaClient.js",
		"KalturaAccessControlService" : "kalturaJsClient/KalturaServices.js",
		"KalturaAccessControlOrderBy" : "kalturaJsClient/KalturaTypes.js",
		"KalturaAccessControl" : "kalturaJsClient/KalturaVO.js",				
		"MD5" : "kalturaJsClient/webtoolkit.md5.js"
	} );
	
	// Set a local variable with the request set so we can append it to embedPlayer
	var kalturaSupportRequestSet = [		
	  'KalturaClientBase',
	  'KalturaClient',
	  'KalturaAccessControlService',
	  'KalturaAccessControlOrderBy',
	  'KalturaAccessControl',
	  'MD5',
	  'mw.KWidgetSupport',	  
	  'mw.KAnalytics',
	  'mw.KDPMapping',
	  'mw.MobileAdTimeline',		
	  'mw.KAds' 
	];
	
	mw.addModuleLoader( 'KalturaPlaylist', function() {
		return $j.merge( kalturaSupportRequestSet, 
			[ 
			  'mw.PlaylistHandlerKaltura', 
			  'mw.PlaylistHandlerKalturaRss'
			]);
	});

	//Check if the document has kaltura objects ( for fall forward support ) 
	$j( mw ).bind( 'LoaderEmbedPlayerDocumentHasPlayerTags', function( event, tagCheckObject ){
					
		mw.log( 'KalturaSupport found:: ' + mw.getKalturaPlayerList().length + ' is mobile::' +  mw.isMobileHTML5() );
		if( mw.getKalturaPlayerList().length ) {
			tagCheckObject.hasTags = true;			
			// FALLFORWARD only for mobile safari ::
			// this is kind of heavy weight for loader.js 
			// maybe move most of this to kEntryId support			
			if( mw.isMobileHTML5() ) {
				// setup load flags
				var loadEmbedPlayerFlag = loadPlaylistFlag = false;
				$j.each(mw.getKalturaPlayerList(), function( inx, element ){	
					// Clear the kalturaSwapObjectClass
					var kalturaSwapObjectClass = '';
					// Setup the flashvars variable
					var flashvars = {};
					var flashVarsString = $j( element ).find( "param[name='flashvars']" ).val();
					// try alternate case: 
					if( !flashVarsString ){
						flashVarsString = $j( element ).find( "param[name='flashVars']" ).val();
					}
					if( flashVarsString ){
						var flashVarPairs = flashVarsString.split('&');
						for( var i =0; i < flashVarPairs.length; i++ ) {
							var parts = flashVarPairs[i].split('=');
							flashvars[ parts[0] ] = unescape( parts.slice(1).join('=') );
						}			
					}
			
					// Get the swf source from the element: 
					var swfSource =  $j( element ).attr( 'data' );
					// try to get the source from a param if not defined in the top level embed. 
					if( !swfSource ) {
						swfSource = $j( element ).find( "param[name=data]").attr( 'value' );						                                      
					}
					
					var kEmbedSettings = mw.getKalturaEmbedSettings( swfSource, flashvars );

					// check if its a playlist or a entryId
					mw.log("Got kEmbedSettings.entryId: " + kEmbedSettings.entryId + " uiConf: " + kEmbedSettings.uiconfId)
					
					var height = $j( element ).attr('height');
					var width = $j( element ).attr('width');					
					var videoId = 'vid' + inx;					
					var $imgThumb = '';		
					var elementCss = {};
				
					// Setup the video embed attributes: 
					var videoEmbedAttributes = {	
						'id': videoId,	
						'kwidgetid' : kEmbedSettings.widgetId,
						'kuiconfid' : kEmbedSettings.uiconfId
					}
					if( kEmbedSettings.entryId ) {	
						loadEmbedPlayerFlag = true;
						kalturaSwapObjectClass = 'mwEmbedKalturaVideoSwap';
						videoEmbedAttributes.kentryid = kEmbedSettings.entryId;
						if( kEmbedSettings.partnerId ){
							var thumb_url = mw.getConfig( 'Kaltura.CdnUrl') + '/p/' + kEmbedSettings.partnerId + '/sp/' +
											kEmbedSettings.partnerId + '00/thumbnail/entry_id/' + kEmbedSettings.entryId + '/width/' +
											height + '/height/' + width;
							$imgThumb = $j('<img />').attr({
								'src' : thumb_url
							})
							.css({
								'width' : width + 'px',
								'height' : height + 'px',
								'position' : 'absolute',
								'top' : '0px',
								'left' : '0px'								
							});							
						}
					} else {						
						// Assume playlist 
						loadPlaylistFlag = true;
						kalturaSwapObjectClass = 'mwEmbedKalturaPlaylistSwap';
						// check if we can get the playlist id from a url in the embed code 
						// ( some version of kaltura embed code work this way)
						if( flashvars['playlistAPI.kpl0Url'] ){
							videoEmbedAttributes['kplaylistid'] = mw.parseUri( flashvars['playlistAPI.kpl0Url'] ).queryKey['playlist_id'];
							if( ! videoEmbedAttributes['kplaylistid'] ){
								videoEmbedAttributes['kplaylistid'] = flashvars['playlistAPI.kpl0Url'];
							}
						}					
					}					
					// Replace with a mwEmbedKalturaVideoSwap
					$j( element ).replaceWith( 
						$j('<div />')
						.attr( videoEmbedAttributes )
						.css( {
							'width' : width + 'px',
							'height' : height + 'px',
							'position': 'relative',
							'display' : 'block',
							'float' : 'left',
							'padding' : '3px'
						} )
						.addClass( kalturaSwapObjectClass )
						.append(
							$imgThumb, 
							$j('<div />')
							.attr('id', 'loadingSpinner_' + videoId )
							.css({
								'margin' : 'auto',
								'top' : '35%',
								'position' : 'relative',
								'width' : '32px',
								'height' : '32px'
							})
							.loadingSpinner()
						)
					)					
				});
				
				// Do loading then rewrite each tag: 
				
				if( loadPlaylistFlag ){
					kLoadKalturaSupport = true;
					var playlistRequest = [ 'EmbedPlayer', 'Playlist', 'KalturaPlaylist' ];
										
					mw.load( playlistRequest, function(){
						// kalturaPlaylistObject has player loader built in: 
						$j('.mwEmbedKalturaPlaylistSwap').each( function( inx, playlistTarget ) {	
							var playlistConfig = {
								'uiconfid' : $j( playlistTarget ).attr( 'kuiconfid' ),
								'widgetid' : $j( playlistTarget ).attr( 'kwidgetid' ),
								'playlistid':  $j( playlistTarget ).attr( 'kplaylistid' )
							};									
							
							// Check if we have a mediaRss url as the playlistId
							if( mw.isUrl( playlistConfig.playlistid ) ) {	
								var kalturaPlaylistHanlder = new mw.PlaylistHandlerKalturaRss( playlistConfig );								
							} else {						
								var kalturaPlaylistHanlder = new mw.PlaylistHandlerKaltura( playlistConfig );
							}
							
							// quick non-ui conf check for layout mode							
							var layout = ( $j( playlistTarget ).width() > $j( playlistTarget ).height() ) 
											? 'horizontal' : 'vertical';												
							
							var playlistPlayer = $j( '#' + playlistTarget.id ).playlist({
								'layout': layout,
								'sourceHandler' : kalturaPlaylistHanlder
							});  														
						});
					});
				}
				
				if( loadEmbedPlayerFlag ){	
					mw.log("KalturaLoader:: load EmbedPlayer");
					mw.load('EmbedPlayer', function(){		
						// Remove the general loading spinner ( embedPlayer takes over )						
						$j('.mwEmbedKalturaVideoSwap').embedPlayer();
					})
				}
			}
		}
	});
		
	var kLoadKalturaSupport = false;	
	//Update the player loader request with timedText if the flag has been set 
	$j( mw ).bind( 'LoaderEmbedPlayerUpdateRequest', function( event, playerElement, classRequest ) {		
		// Check if any video tag uses the "kEmbedSettings.entryId"  
		if(  $j( playerElement ).attr( 'kentryid' ) ) {
			kLoadKalturaSupport = true;
		}		
		
		// Add kaltura support hook
		if( kLoadKalturaSupport ) {
			for(var i =0; i < kalturaSupportRequestSet.length; i++ ){
				if( $j.inArray(kalturaSupportRequestSet[i], classRequest ) == -1 ){
					classRequest.push( kalturaSupportRequestSet[i] );
				}
			}
		}		
	} );
	
	/**
	 * Get the list of embed objects on the page that are 'kaltura players' 
	 */
	mw.getKalturaPlayerList = function(){
		var kalturaPlayers = [];
		// check all objects for kaltura compatible urls 
		var objectList = document.getElementsByTagName('object');		
		var tryAddKalturaEmbed = function( url ){
			var settings = mw.getKalturaEmbedSettings( url );
			if( settings && settings.uiconfId && settings.widgetId ){
				kalturaPlayers.push(  objectList[i] );
				return true
			}
			return false;
		}
		for( var i =0; i < objectList.length; i++){
			if( objectList[i].getAttribute('data') ){
				if( tryAddKalturaEmbed( objectList[i].getAttribute('data') ) )
					continue;
			}
			var paramTags = objectList[i].getElementsByTagName('param');
			for( var j = 0; j < paramTags.length; j++){
				if( paramTags[j].getAttribute('name') == 'data'
					||
					paramTags[j].getAttribute('name') == 'src' )
				{
					if( tryAddKalturaEmbed( paramTags[j].getAttribute('value') ) )
						break;
				}
			}
		}		
		return kalturaPlayers;
	}
	
	mw.getKalturaEmbedSettings = function( swfUrl, flashvars ){
		if( !flashvars )
			flashvars= {};
		
		var dataUrlParts = swfUrl.split('/');
		var embedSettings = {};		
		
		// Search backward for key value pairs 		
		var prevUrlPart = null;
		while( dataUrlParts.length ){
			var curUrlPart =  dataUrlParts.pop();
			switch( curUrlPart ){
				case 'p':
					embedSettings.widgetId = '_' + prevUrlPart;
					embedSettings.partnerId = prevUrlPart;
				break;
				case 'wid':
					embedSettings.widgetId = prevUrlPart;
					embedSettings.partnerId = prevUrlPart.replace(/_/,'');
				break;
				case 'entry_id':
					embedSettings.entryId = prevUrlPart;
				break;
				case 'uiconf_id':
					embedSettings.uiconfId = prevUrlPart;
				break;
				case 'cache_st':
					embedSettings.cacheSt = prevUrlPart;
				break;
			}
			prevUrlPart = curUrlPart;
		}
		// Add in Flash vars embedSettings ( they take precedence over embed url ) 
		for( var i in  flashvars){
			embedSettings[i] = flashvars[i];
		}
		return embedSettings;
	};
	
} )( window.mw );