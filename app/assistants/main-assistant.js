function MainAssistant(argFromPusher) {

}

MainAssistant.prototype = {
	setup: function() {
		Ares.setupSceneAssistant(this);

     this.controller.setupWidget(Mojo.Menu.appMenu, newsMenuAttr, newsMenuModel);
     
     this.newsUrls = {};
     // list widget
     this.newsModel = {"items": []} // [{title:'foo'}]}
     this.controller.setupWidget("mainListWgt",
        this.attributes = {
            itemTemplate: "main/mainRowTemplate",
            listTemplate: "main/mainListTemplate",
            swipeToDelete: false,
            renderLimit: 40,
            reorderable: false
        },
        this.newsModel
    );
    //this.mainListHandler = this.loadDataSource.bindAsEventListener(this);    
    this.controller.listen("mainListWgt", Mojo.Event.listTap, function(event){});
    
    // handler for pull to refesh
    this.controller.listen("newsScroller",Mojo.Event.scrollStarting, this._scrollStart.bind(this));
    
    this.topicModel = getEditionTopics(global_ned);
    this.controller.setupWidget("topicSelector",
        this.attributes = {
           choices: this.topicModel
        },
        this.model = {
          value: getTopicLabel(global_ned, global_topic),
          disabled: false
       }
    ); 
    this.topicSelectorHandler = this.handleTopicSelect.bindAsEventListener(this);    
    this.controller.listen("topicSelector", Mojo.Event.propertyChange, this.topicSelectorHandler);

    // spinner
    this.controller.setupWidget("spinner",
        this.attributes = {spinnerSize: "large"},
        this.model = {spinning: true }
    ); 
    this.controller.setupWidget("spinner_small",
        this.attributes = {spinnerSize: "small"},
        this.model = {spinning: false }
    ); 
    global_page = 1;
    this.requestApi(global_topic);
    this.setTopicColor(global_topic);
	},
	cleanup: function() {
		Ares.cleanupSceneAssistant(this);
	},
	pulled_counter: 0,
};

MainAssistant.prototype.setTopicColor = function(topic, with_items) {    
    var color = getTopicColor(topic);
    this.controller.get('topicColorBox').style.backgroundColor = color;
    this.controller.get('topicSelector').style.borderColor = color;
    this.controller.get('topicSelector').style.color = color;
    if(with_items == true) {         
       var elems = $$('div.moreSourcesBox');
       for (i=0;i<=elems.length;i++) {try {elems[i].style.borderColor = color} catch(e) {};}
       var elems = $$('div.moreSourcesBoxWrapper');
       for (i=0;i<=elems.length;i++) {try {elems[i].style.background = color} catch(e) {};}
       var elems = $$('div.moreCorner');
       for (i=0;i<=elems.length;i++) {try {elems[i].style.backgroundColor = color} catch(e) {};}       
       var elems = $$('div.moreSources');
       for (i=0;i<=elems.length;i++) {try {elems[i].style.borderColor = color} catch(e) {};}             
       var elems = $$('div.moreLabel');
       for (i=0;i<=elems.length;i++) {try {elems[i].style.color = color} catch(e) {};}             
    } else {
       var elems = $$('div.newsitem');
       for (i=0;i<=elems.length;i++) {try {elems[i].style.borderColor = color} catch(e) {};}             
    }
}    

MainAssistant.prototype.loadDataSource = function(event)
{
    //Mojo.Controller.stageController.pushScene( this.listItems[event.index].title.toLowerCase() );
}

MainAssistant.prototype.spinnerAction = function(mode) {
   var spinner_id = 'spinner';
   if(global_page > 1) spinner_id += '_small';
   if(mode == "start") {
      this.controller.get(spinner_id).mojo.start()
   } else if(mode == "stop") {
      this.controller.get(spinner_id).mojo.stop()
   }
}

MainAssistant.prototype.mainListLoadMore = function(event)
{
    Mojo.Log.error("Load more newsitems");
    //Mojo.Controller.stageController.pushScene( this.listItems[event.index].title.toLowerCase() );
}

MainAssistant.prototype.handleTopicSelect = function(event)
{
    //Mojo.Log.error("Topic selected: "+event.value);
    this.setTopicColor(event.value);  
    global_topic = event.value;
    global_page = 1;
    global_page_triggered = 1;
    this.newsModel["items"] = [];
    this.newsUrls = {};
    this.controller.modelChanged(this.newsModel);
    this.spinnerAction('start');
    this.requestApi(event.value);
}

MainAssistant.prototype.editionUpdate = function(edition) {
   Mojo.Log.error('edition updated: '+global_ned);
   global_ned = edition;
   global_page = 1;
   //global_topic = 'h';
   Mojo.Controller.stageController.swapScene({name: "main", disableSceneScroller: true});   
}

MainAssistant.prototype.requestApi = function(topic) {
    try {    
        if(!topic) {
            throw('requestApi(): topic must be defined');
        }
        var start = (global_page-1)*global_page_length;
        var url = 'http://ajax.googleapis.com/ajax/services/search/news?v=1.0';
        url += '&ned='+global_ned+'&rsz=large&topic='+topic+'&start='+start;
        //Mojo.Log.error('API URL: '+url);
        var request = new Ajax.Request(url,{
            method: 'GET',
            //parameters: {'op': 'getAllRecords', 'table': table},
            evalJSON: 'true',
            onSuccess: this.requestNewsSuccess.bind(this),
            onFailure: function(){
                Mojo.Log.error('Failed to get Ajax response');
                this.spinnerAction('stop');
            }
        });
    }
    catch(e) {
        Mojo.Log.error(e);
    }
}
 
MainAssistant.prototype.requestNewsSuccess = function(response) {
 
    //Mojo.Log.error('Got Ajax response: ' + response.status);
    //Mojo.Log.error('Got Text: ' + response.responseText);
    var data=response.responseText;  
    try {  
       var json = data.evalJSON();  
    } catch(e) {  
       Mojo.Log.error(e);  
    }  
    
    try {
        var resultData = json['responseData']['results'];
        this.renderNews(resultData);
    }
    catch(e) {
        Mojo.Log.error(e);
    }
}

MainAssistant.prototype.renderNews = function(data) {
    var newData = [];
    var more_display = 'none';
    if(global_topic != "ir") var more_display = 'block';
    var dblClick = '';
    var onClick = '';
    if(global_dbl_click == 'On') {
             var dblClick = 'MainAssistant.prototype.moreLinkClicked(this);return false;';
             var onClick = 'return false;';
    }
    for (j=0;j<data.length;j++) {
        res = j;
        try {
          var url = decodeURIComponent(data[res]['url']);
          var headline = data[res]['titleNoFormatting'];
          var content = data[res]['content'];
          var publisher = data[res]['publisher'];

          var date = new Date(data[res]['publishedDate']);
          var published = Mojo.Format.formatDate(date,{date:'medium',time:'short'});
          //var published = date.getDate()+'.'+date.getMonth()+'.'+(1900+date.getYear())+' '+date.getHours()+':'+date.getMinutes();
          var imageData = data[res]['image']
          var imageHtml = ''
          if(global_load_images == "On") {
            try {
                var ratio = 110 / imageData['tbWidth'];
                imageHtml += '<img src="'+imageData['url']+'" alt="" ';
                imageHtml += 'style="width:'+(imageData['tbWidth']*ratio)+'px; height:'+(imageData['tbHeight']*ratio)+'px;" class="newsPic" />';              
            } catch(e) {}
          }
          var relatedsHtml = ''

         try {
              var rel = data[res]['relatedStories']; 
              for (i=0;i<=rel.length;i++) {
                   relatedsHtml += '<div><a href="'+rel[i]['unescapedUrl']+'" class="moreLink" ';
                   if(global_dbl_click == 'On') relatedsHtml += 'onClick="'+onClick+'" onDblClick="'+dblClick+'"';
                   relatedsHtml += '>'+rel[i]['titleNoFormatting']+'</a>&#160;&#160;<span class="morePublisher">'+rel[i]['publisher']+'</span></div>';
              }
          } catch(e) {}    
          itemIndex = (global_page*global_page_length)+res
          var add = true;
          var display = 'block';          
          if(this.newsUrls.hasOwnProperty(url)) {
             display = 'none';
             Mojo.Log.error('ALREADY EXISTS'+url);
          }
          this.newsUrls[url] = 1;
          newData[res] = {
          index: itemIndex,
          title: headline, 
          href:url, 
          teaser: content, 
          publisher:publisher,
          date: published,
          image: imageHtml,
          more_label: gnewsEditions[global_ned].more,
          more_display: more_display,
          relateds: relatedsHtml,
          display:display,
          onclick:onClick,
          ondblclick:dblClick}                          
        } catch(e) {
          Mojo.Log.error(e);
        }
    }
    this.spinnerAction('stop');
    if(global_page > 1) {
       this.newsModel["items"] = this.newsModel["items"].concat(newData);
    } else {
       this.newsUrls = [];
       this.newsModel["items"] = newData;
    }
    this.controller.modelChanged(this.newsModel);
    this.setTopicColor(global_topic, (more_display=='block'));      
    if(newData.length == global_page_length) {
       $('newslist').insert(this.getMoreListItem());
       this.loadMoreHandler = this.loadNextPage.bindAsEventListener(this);    
       this.controller.listen("itemLoadMore", Mojo.Event.tap, this.loadMoreHandler)
    }
    if(global_page == 1) {
       this.controller.get('newsScroller').mojo.revealTop()
    } else {
       global_page_triggered = global_page;
    }
}

MainAssistant.prototype.loadNextPage = function(event) {   
   $('load-more-icon').hide();
   global_page = global_page + 1;
   Mojo.Log.error('load more:' + global_page);
   this.spinnerAction('start');
   this.requestApi(global_topic);
}

MainAssistant.prototype.getMoreListItem = function() {
    var html = '<div class="no-separator load-more" x-mojo-touch-feedback="immediate" ';
    html += ' id="itemLoadMore">'; 
    html += '<div class="palm-row-wrapper" id="load-more-icon" style="border-bottom:1px solid #fff;">';
    html += '&#9660</div>';    
    html += '</div>';
    return html;
}
MainAssistant.prototype.showMoreSources = function(index) {
   //Mojo.Log.error("Show more sources: "+index);   
   $('moreExpandPrefix_'+index).toggle();
   $('moreExpandSuffix_'+index).toggle();
   $('moreCollapsePrefix_'+index).toggle();
   $('moreCollapseSuffix_'+index).toggle();
   $('moreSources_'+index).toggle();
}

MainAssistant.prototype.moreLinkClicked = function(link) {
   Mojo.Log.error('link clicked: '+link.href);
   var request = new Mojo.Service.Request('palm://com.palm.applicationManager', {
    method: 'open',
    parameters: {
      id: 'com.palm.app.browser',
      params: {
        target: link.href
      }
    }
  });
}

MainAssistant.prototype._scrollStart = function(event) {
        //the event object returned is a pointer to the moved event of the list, which returns some cool info about the scrolling of list: position, if its finishing up moving, etc
        event.addListener(this);
};

MainAssistant.prototype.moved = function(stopped,position) {
        var index = this.controller.get("mainListWgt").mojo.getLength()-1
        var itemNode = this.controller.get("mainListWgt").mojo.getNodeByIndex(index);        
        if(itemNode){                
                var offset = Element.viewportOffset(itemNode); 
                if(offset.toArray()[1] < 85 && global_page_triggered == global_page){
                    this.pulled_counter++;
                    //Mojo.Log.error('COUNTER: '+this.pulled_counter+' / '+offset.toArray()[1]);
                    if(this.pulled_counter >= 16) {
                        //Mojo.Log.error('COUNTER TRIGGERED: '+this.pulled_counter);                        
                        this.loadNextPage();
                        this.pulled_counter = 0;
                    }
                } else this.pulled_counter = 0;
        }
};