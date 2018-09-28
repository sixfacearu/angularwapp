var tradingViewFunctions = new function(){
    var container_id = undefined;
    this.initialize = function(containerId){
        container_id = containerId;
        new TradingView.widget({
            "container_id": container_id,
            "width": 920,
            "height": 540,
            "symbol": "BITFINEX:ETHUSD",
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "light",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "rgba(66, 66, 66, 1)",
            "enable_publishing": false,
            "hide_top_toolbar": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "hideideas": true
        });
    }

    this.changeSymbol = function(symbol){
        if(!container_id || container_id === ""){
            return;
        }
        if(!symbol || symbol === "")
            symbol = "BITFINEX:ETHUSD";
        new TradingView.widget({
            "container_id": container_id,
            "width": 1060,
            "height": 540,
            "symbol": symbol,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "light",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "rgba(66, 66, 66, 1)",
            "enable_publishing": false,
            "hide_top_toolbar": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "hideideas": true
        });
    }
};
