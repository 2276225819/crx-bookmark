$(function(){ 
	var $ul = $('#list');  
	var base_url='';   
	getFavoritesUrlAsync().then(function(favorites_location){
		return base_url=favorites_location; 
	}).then(function(favorites_location){
		base_url=favorites_location;
		return getFileListAsync(favorites_location) ;
	}).then(function(arr){ 
		render($ul,arr);   
	},function(error){ 
		alert('init error:'+error);
		console.log(error);
	});  
	$(document) 
	.on('click','#tool>.title',function(){
        chrome.tabs.create({url:'https://onedrive.live.com/',selected:true}); 
    })
	.on('click','#tool>.add',function(){ 
		if(base_url) queryNowTabAsync().then(function(tab){ 
			$ul.html('<li>加载中...</li>')
			return addFileAsync(base_url,tab.title,tab.url); 
		}).then(function(){
			return getFileListAsync(base_url) 
		}).then(function(list){ 
			render($ul,list);  
		});
	})
});

function render($parent,data){  
    $parent.empty();
	$.each(data,function(i,item){
		var $li = $('<li></li>').appendTo($parent) ; 
        if(item.type=='folder'){ 
			$li.attr('class','folder');
            var $ul = $('<ul>').appendTo($li); 
            var $title = $('<div>'+item.name+'</div>')
				.prependTo($li) 
            var $new = $('<button class="add" title="添加新书签"></button>')
				.prependTo($li) 
			$new.click(function(){ 
				queryNowTabAsync().then(function(obj){
					$li.addClass('load');
					$ul.html('<li>加载中...</li>')
					return addFileAsync(item.upload_location,obj.title,obj.url); 
				}).then(function(){
					return getFileListAsync(item.upload_location) 
				}).then(function(list){
					$li.removeClass('load');
					if(list)render($ul,list);  
				});
			});
			$title.one('click',function(){  
				if($ul.html()) return $ul.html("");
				$li.addClass('load');
				$('<li>加载中...</li>').appendTo($ul);
				getFileListAsync(item.upload_location).then(function(list){
					$li.removeClass('load');
					if(list)render($ul,list);  
				}); 
			}).click(function(){
				$li.toggleClass('show');
			})
        }      
        if(item.type=='file'){ 
            var name = item.name.replace(/\.url$/,'');
            var $title = $('<div>'+item.name+'</div>')
				.prependTo($li)  
			var $del = $('<button class="del" title="删除书签"></button>')
				.prependTo($li);
			getCacheAsync(item.upload_location).then(function(html){
				return html || new Promise(function(next,err){
					$li.one('mouseover',function(){
						$li.addClass('load');
						next();
					});
				}).then(function(){
					return getFileAsync(item.upload_location)
				}).then(function(html){ 
					$li.removeClass('load');
					return html;
				});
			}).then(function(html){
				$li.attr('class','file');
				$del.click(function(){
					$li.addClass('load');
					delFileAsync(item.upload_location).then(function(){
						var upload_location = 'https://apis.live.net/v5.0/'+item.parent_id+'/files/';
						setCacheAsync(upload_location,'');
						return getFileListAsync(upload_location);
					}).then(function(list){
						$li.removeClass('load');
						if(list)render($parent,list);  
					});
				});
				$title.click(function(){
					var src = html;  
					chrome.tabs.create({url:src,selected:true}); 
				}) 
			});
        } 
    });
} 
 
function chromeCallAsync(arr){ 
	return new Promise(function(next){ 
		var k = Date.now();
		arr.unshift(k);
		chrome.extension.onMessage.addListener(function T(args){   
			if(args.id == k){  
				next(args.data);
				chrome.extension.onMessage.removeListener(T);
			}
		});
    	chrome.extension.sendMessage(arr);    
	});
}
function getCacheAsync(name){  
	return chromeCallAsync(['getCacheAsync',name] ); 
}
function setCacheAsync(name,val){  
	return chromeCallAsync(['setCacheAsync',name,val] ); 
} 
function addFileAsync(upload_location,file,url){ 
	return chromeCallAsync(['addFileAsync',upload_location,file,url] );
}
function delFileAsync(upload_location){  
	return chromeCallAsync(['delFileAsync',upload_location] );
}
function getFileAsync(upload_location){ 
	return chromeCallAsync(['getFileAsync',upload_location] );
}
function getFileListAsync(upload_location){  
	return chromeCallAsync(['getFileListAsync',upload_location] );
}
function getFavoritesUrlAsync(){  
	return chromeCallAsync(['getFavoritesUrlAsync']);
}