

// setting FlowPlayer conf object
var flowplayer_conf = {
	clip: { 
	  url: 'test', 
	  provider: 'rtmp' 
	}, 

	plugins: { 
	  rtmp: { 
		url: 'flowplayer/flowplayer.rtmp-3.2.13.swf', 
		netConnectionUrl: 'rtmp://matis-port-1133:8181/live'
	  } 
	} 
};
var myplayer = flowplayer("player", "flowplayer/flowplayer-3.2.18.swf", flowplayer_conf);


$('#myMenuTab a').click(function (e) {
	e.preventDefault()
	$(this).tab('show')
});

$('#moreTabs a').click(function (e) {
	e.preventDefault()
	$(this).tab('show')
});

 $('.panel-heading span.clickable').on("click", function (e) 
 {
	if ($(this).hasClass('panel-collapsed')) {
		// expand the panel
		//$(this).parents('.panel').find('.panel-body').slideDown();
		$(this).parents('.panel').find('.panel-body').toggle(100);
		$(this).removeClass('panel-collapsed');
		$(this).find('i').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
	}
	else {
		// collapse the panel
		//$(this).parents('.panel').find('.panel-body').slideUp();
		$(this).parents('.panel').find('.panel-body').toggle(100);
		$(this).addClass('panel-collapsed');
		$(this).find('i').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
	}
});




