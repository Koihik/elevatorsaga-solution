
{
    init: function(elevators, floors) {
        // solution-v0.2
        // Elapsed time 2007
        // Avg waiting time 13.8s
        // Max waiting time 62.5s

        MAX_FLOOR = floors.length;
        MAX_ELEV = elevators.length;

        UP_TASK_INTERNAL = MAX_FLOOR * 100;

        _uplist = new Array();
        _downlist = new Array();
        //===============================
        //CONSTANTS
        STATE_IDLE  = 0;
        STATE_UP    = 1;
        STATE_DOWN  = 2;

        //===============================
        //FUNCTION EXTEND
        Array.prototype.unique = function(){
            var n = {},r=[]; 
            for(var i = 0; i < this.length; i++) {
                if (!n[this[i]]) {
                    n[this[i]] = true;
                    r.push(this[i]);
                }
            }
            return r;
        }
        Array.prototype.remove = function (dx) {  
            if (isNaN(dx) || dx > this.length) {  
                return false;  
            }  
            for (var i = 0, n = 0; i < this.length; i++) {  
                if (this[i] != this[dx]) {  
                    this[n++] = this[i];  
                }  
            }  
            this.length -= 1;  
        };  
        //===============================
        function startUpTask(e){
            if(e.state == STATE_IDLE){
                e.stop();
            }
            var c = e.currentFloor();
            if(floors[c].buttonStates.up!=""){
                _uplist.push(c);
                _uplist = _uplist.unique().sort(function(a,b){
                    return a>b;
                });
            }
            e.state = STATE_UP;
            e.goingUpIndicator(true);
            e.goingDownIndicator(false);
            e.goToFloor(0);
        }

        function startDownTask(e){
            if(e.state == STATE_IDLE){
                e.stop();
            }
            e.state = STATE_DOWN;
            e.goingUpIndicator(false);
            e.goingDownIndicator(true);
            var c = e.currentFloor();
            if(floors[c].buttonStates.down!=""){
                _downlist.push(c);
                _downlist = _downlist.unique().sort(function(a,b){
                    return a<b;
                });
            }
            if(isFull(e)){
                e.goToFloor(0);
            }else{
                if(e.loadFactor()==0){
                    e.goToFloor(_downlist[0]);
                    _downlist.shift();
                }else{
                    var nextFloor = 0;
                    for(var j=0;j<_downlist.length;j++){
                        if(_downlist[j]<c){
                            nextFloor = _downlist[j];
                            if(_downlist[j]!=0){
                                _downlist.remove(j);
                            }
                            break;
                        }
                    }
                    e.goToFloor(nextFloor);
                }
            }
        }

        function assignTask(e){
            if(e.loadFactor()!=0 && e.state == STATE_DOWN){
                startDownTask(e);
                return "down";
            }
            if(e.currentFloor()>floors.length/2 && _downlist.length>0){
                startDownTask(e);
                return "down";
            }
            // if(e.currentFloor()==0 && _uplist.length>0){
            //     startUpTask(e);
            //     return "up";
            // }
            if(_uplist.length==0){
                if(_downlist.length==0){
                    // e.goToFloor(e.idle_floor);
                    return "";
                }else{
                    startDownTask(e);
                    return "down";
                }
            }else{
                if(_downlist.length==0){
                    startUpTask(e);
                    return "up";
                }else{
                    var upCount = 0;
                    var downCount = 0;
                    for(var i=0;i<MAX_ELEV;i++){
                        if(elevators[i].state == STATE_UP){
                            upCount++;
                        }else if(elevators[i].state == STATE_DOWN){
                            downCount++;
                        }
                    }
                    if(upCount>=downCount){
                        startDownTask(e);
                        return "down";
                    }else{
                        startUpTask(e);
                        return "up";
                    }
                }
            }
        }

        function isFull(e){
            var loadFactor = e.loadFactor();
            var maxPassengerCount = e.maxPassengerCount();
            var neededAvgPassengerSpace = 1.5;
            return (1-loadFactor) < (neededAvgPassengerSpace/maxPassengerCount)
        }

        var p = MAX_FLOOR / (MAX_ELEV+1);
        var totalCapacity = 0;

        for(var i=0;i<MAX_ELEV;i++){
            var e = elevators[i];
            totalCapacity += e.maxPassengerCount();
            e.ei = i;
            e.state = STATE_IDLE;
            e.idle_floor = Math.round(p * (i) + 0.5);
            // e.idle_floor = 0;
            e.startWaitingTime = 0;

            e.on("floor_button_pressed", function(n) {
                if(n > 0){
                    this.state = STATE_UP;
                    while(_uplist.length>1){
                        this.destinationQueue.push(_uplist.pop());
                    }

                    this.destinationQueue.push(n);
                    this.destinationQueue = this.destinationQueue.unique().sort(function(a,b){
                        return a>b;
                    });
                    this.checkDestinationQueue();
                }
            });
            e.on("stopped_at_floor",function(n){
                // Do nothing
            });
            e.on("idle",function(){
                // console.log(this.ei+" idle");
                assignTask(this);
            });    
        }

        for(var i=0;i<MAX_ELEV;i++){
            var e = elevators[i];
            e.weight = e.maxPassengerCount() / totalCapacity;
            console.log("e "+i+ " weight = "+e.weight);
        }

        function notifyElevators(){
            for(var i=0;i<MAX_ELEV;i++){
                var e = elevators[i];
                if(e.state == STATE_IDLE){
                    if(assignTask(e)!=""){
                        break;
                    }
                }
            }
        }

        for(var i=0;i<MAX_FLOOR;i++){
            var f = floors[i];
            f.on("up_button_pressed",function(){
                _uplist.push(this.level);
                _uplist = _uplist.unique().sort(function(a,b){
                    return a>b;
                });
                notifyElevators();
            });
            f.on("down_button_pressed",function(){
                _downlist.push(this.level);
                _downlist = _downlist.unique().sort(function(a,b){
                    return a<b;
                });
                notifyElevators();
            });
        }

    },
    update: function(dt, elevators, floors){}
}