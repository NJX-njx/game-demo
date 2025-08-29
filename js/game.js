window.addEventListener('load', function() {
    const platforms = [
        {x: 200, y: 500, width: 300, height: 10,canSpawnEnemy:true},
        {x: 400, y: 350, width: 200, height: 10,canSpawnEnemy:true},
        {x: 600, y: 200, width: 150, height: 10,canSpawnEnemy:true},
        {x: 50, y: 400, width: 100, height: 10,canSpawnEnemy:false}
    ];
    const walls=[
        {x:200,y:600,width:10,height:120},
        {x:700,y:450,width:10,height:150},
        {x:500,y:50,width:10,height:200}
    ];
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    const jumpspeed=-12;
    canvas.width = 800;
    canvas.height = 720;
    let enemies=[];
    const Ground={
        x:0,
        y:canvas.height,
        width: canvas.width,
        height:10,
        canSpawnEnemy:true
    };
    class InputHandler {
        constructor() {
            this.keys = [];
            window.addEventListener('keydown', e => {
                if ((e.key === ' ' ||
                     e.key === 'a' ||
                     e.key === 'd' ||
                     e.key==='k' ||
                     e.key==='j') && 
                     this.keys.indexOf(e.key) === -1) {
                    this.keys.push(e.key);
                }
            });
            window.addEventListener('keyup', e => {
                if (e.key === ' ' || 
                    e.key === 'a' || 
                    e.key === 'd' ||
                    e.key==='k'||
                    e.key==='j') {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
                }
            });
        }
    }
    class Player{
        constructor(gameWidth,gameHeight){
            this.gameWidth=gameWidth;
            this.gameHeight=gameHeight;
            this.width=50;
            this.height=50;

            this.x=0;
            this.y=this.gameHeight-this.height;

            this.frameX=0;
            this.frameY=0;

            this.speed=0;
            this.vy=0;
            this.weight=0.5;
            this.lastmoveDirection=0;

            this.image=document.getElementById('playerImage');

            this.jumpCnt=0;
            this.maxJump=2;
            this.prevJump=false;
            this.jumpSound1 = new Audio('../music/sound/jump1.wav');
            this.jumpSound2 = new Audio('../music/sound/jump2.wav'); 

            this.isDashing=false;
            this.dashDuration=18;
            this.dashTimer=0;
            this.dashCooldown=0;
            this.dashCooldownMax=600;
            this.dashspeed=15;
            this.dashSound = new Audio('../music/sound/dash.wav');

            this.isAttacking=false;
            this.attackDuration=10;
            this.attackTimer=0;
            this.attackCooldown=0;
            this.attackCooldownMax=60;
            this.attackSound1 = new Audio('../music/sound/attack1.wav');
            this.attackedEnemyIds= new Set();
            this.attackDamage=1;
        }
        jump(input){
            if (!this.prevJump && input.keys.indexOf(' ') > -1 && this.jumpCnt < this.maxJump) {
                this.vy = jumpspeed;
                this.jumpCnt++;
                if(this.jumpCnt==1){
                    this.jumpSound1.currentTime = 0;
                    this.jumpSound1.play();
                }
                else if(this.jumpCnt==2){
                    this.jumpSound2.currentTime = 0;
                    this.jumpSound2.play();
                }
            }   
            this.prevJump = input.keys.indexOf(' ') > -1;
        }
        dash(input){
            if(input.keys.indexOf('k')>-1 &&
             this.dashCooldown===0&&!this.isDashing){
                this.isDashing=true;
                this.dashTimer=this.dashDuration;
                this.dashCooldown=this.dashCooldownMax;
                this.dashSound.currentTime = 0;
                this.dashSound.play();
            }
            let moveSpeed=5;
            if(this.isDashing&&this.dashTimer>0){
                moveSpeed=this.dashspeed;
                this.dashTimer--;
                if(this.dashTimer===0){
                    this.isDashing=false;
                }
            }
            return moveSpeed;
        }
        attack(input){
            if(input.keys.indexOf('j')>-1 && !this.isAttacking && this.attackCooldown===0){
                this.isAttacking=true;
                this.attackTimer=this.attackDuration;
                this.attackCooldown=this.attackCooldownMax;
                this.attackSound1.currentTime = 0;
                this.attackSound1.play();
                this.attackedEnemyIds.clear();
            }
            if(this.isAttacking&&this.attackTimer>0){
                this.attackTimer--;
                if(this.attackTimer===0){
                    this.isAttacking=false;
                }
            }
        }
        getAttackBox(){
            if(!this.isAttacking) return null;
            if(this.lastmoveDirection===1){
                return {
                    x: this.x + this.width,
                    y: this.y + this.height / 4,
                    width: 30,
                    height: this.height / 2
                };
            }else if(this.lastmoveDirection===-1){
                return{
                    x:this.x -30,
                    y:this.y + this.height/4,
                    width: 30,
                    height: this.height/2
                };
            }
            return null;
        }
        draw(context){
            context.drawImage(this.image,this.x,this.y,this.width,this.height);
            // 后续要用动态动作 需要更改frameX frameY
            if(this.isAttacking){
                context.save();
                context.fillStyle = 'rgba(169, 166, 166, 0.5)';
                if(this.lastmoveDirection===1){
                    context.fillRect(this.x + this.width, this.y + this.height/4, 30, this.height/2);
                }
                else{
                    context.fillRect(this.x - 30, this.y + this.height/4, 30, this.height/2);
                }
                context.restore();
            }
        }
        PlayerMove(input){
            let moveSpeed = this.dash(input);
            this.speed=0;
            if(input.keys.indexOf('d') > -1){
                this.speed = moveSpeed;
                this.lastmoveDirection = 1;
            }
            else if(input.keys.indexOf('a') > -1){
                this.speed = -moveSpeed;
                this.lastmoveDirection = -1;
            }
            this.jump(input);

            this.x += this.speed;
            this.y += this.vy;
            this.platformCollison();
            this.wallColision();
            this.limitation();
        }
        onGround(){
            return this.y >= this.gameHeight - this.height;
        }
        coolDown(){
            if(this.dashCooldown>0) this.dashCooldown--;
            if(this.attackCooldown>0) this.attackCooldown--;
        }
        platformCollison(){
            let onAnyPlatform = false;
            for (let p of platforms) {
                if (
                    this.vy >= 0 &&
                    this.y + this.height <= p.y &&
                    this.y + this.height + this.vy >= p.y &&
                    this.x + this.width > p.x &&
                    this.x < p.x + p.width
                ) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    onAnyPlatform = true;
                }
                if (
                    this.vy < 0 && 
                    this.y < p.y + p.height &&
                    this.y + this.height > p.y + p.height &&  
                    this.x + this.width > p.x &&
                    this.x < p.x + p.width
                ) {
                    this.y = p.y + p.height;
                    this.vy = 0;
                }
            }
            if(!this.onGround() && !onAnyPlatform){
                this.vy += this.weight;
            } else if(this.onGround()||onAnyPlatform){
                this.vy = 0;
                this.jumpCnt = 0;
            }
        }
        wallColision(){
            for (let w of walls) {
                if (
                    this.x + this.width > w.x &&
                    this.x < w.x + w.width &&
                    this.y + this.height > w.y &&
                    this.y < w.y + w.height
                ) {
                    if (this.speed > 0) {
                        this.x = w.x - this.width;
                    }
                    else if (this.speed < 0) {
                        this.x = w.x + w.width;
                    }
                }
            }
        }
        limitation(){
            if(this.x < 0) this.x = 0;
            else if(this.x > this.gameWidth - this.width) {
                this.x = this.gameWidth - this.width;
            }
            if(this.y > this.gameHeight - this.height) {
                this.y = this.gameHeight - this.height;
            }
            else if(this.y<=0) this.y=0;
        }
        update(input){
            this.coolDown();
            this.PlayerMove(input);
            this.attack(input);
        }
    }
    class Enemy{
        constructor(gameWidth,gameHeight,spawnPoint){
            this.gameWidth=gameWidth;
            this.gameHeight=gameHeight;
            this.width=50;
            this.height=50;

            this.image=document.getElementById('enemyImage');

            this.x=spawnPoint.x;
            this.y=spawnPoint.y;

            this.frameX=0;
            this.frameY=0;

            this.speed=1;
            this.direction=-1;
            this.minX=spawnPoint.minX;
            this.maxX=spawnPoint.maxX;

            this.enemyattackedSound= new Audio('../music/sound/enemyattacked.wav');

            this.hp=3;
            this.isdead=false;
            this.id=Date.now()+Math.random();
            this.isInvulnerable=false;
            this.invulnerableTime=15;
            this.invulnerableTimer=0;
        }
        draw(context){
            if(this.isdead) return;
            context.drawImage(this.image,this.x,this.y,this.width,this.height);
            const hpBarWidth=this.width;
            const hpBarHeight=5;
            const hpBarX=this.x;
            const hpBarY=this.y-10;
            context.save();
            context.fillStyle='red';
            context.fillRect(hpBarX,hpBarY,hpBarWidth,hpBarHeight);
            
            context.fillStyle='green';
            const currentHpPercent=this.hp/3;
            const currentHpWidth= hpBarWidth*currentHpPercent;
            context.fillRect(hpBarX,hpBarY,currentHpWidth,hpBarHeight);

            context.strokeStyle='black';
            context.strokeRect(hpBarX,hpBarY,hpBarWidth,hpBarHeight);
            context.restore();
        }
        wallColision(){
            for (let w of walls) {
                if (
                    this.x + this.width > w.x &&
                    this.x < w.x + w.width &&
                    this.y + this.height > w.y &&
                    this.y < w.y + w.height
                ) {
                    if (this.direction > 0) {
                        this.x = w.x - this.width;
                        this.direction=-1;
                    }
                    else if (this.direction< 0) {
                        this.x = w.x + w.width;
                        this.direction=1;
                    }
                }
            }
        }
        checkonPlatform(){
            if(this.y+this.height>=Ground.y){
                this.y=Ground.y-this.height;
                return;
            }
            for(let p of platforms){
                if(this.y+this.height>=p.y&&
                    this.y+this.height<=p.y+5&&
                    this.x+this.width>p.x&&
                    this.x<p.x+p.width
                ){
                    this.y=p.y-this.height;
                    return;
                }
            }
        }
        limitation(){
            if(this.x < 0){
                this.x = 0;
                this.direction=1;
            }
            else if(this.x > this.gameWidth - this.width) {
                this.x = this.gameWidth - this.width;
                this.direction=-1;
            }
            if(this.y > this.gameHeight - this.height) {
                this.y = this.gameHeight - this.height;
            }
            else if(this.y<=0) this.y=0;
        }
        takeDamage(damage){
            if(this.isInvulnerable||this.isdead) return;
            this.hp-=damage;
            if(this.hp<=0){
                this.hp=0;
                this.isdead=true;
            }
            else{
                this.isInvulnerable=true;
                this.invulnerableTimer=this.invulnerableTime;
                this.enemyattackedSound.currentTime=0;
                this.enemyattackedSound.play();
            }
        }

        update(){
            if(this.isdead) return;
            this.checkonPlatform();
            this.x+=this.speed*this.direction;
            if(this.x<=this.minX){
                this.x=this.minX;
                this.direction=1;
            }
            if(this.x>=this.maxX){
                this.x=this.maxX;
                this.direction=-1;
            }
            this.wallColision();
            this.limitation();
            if(this.isInvulnerable){
                this.invulnerableTimer--;
                if(this.invulnerableTimer<=0){
                    this.invulnerableTimer=0;
                    this.isInvulnerable=false;
                }
            }
        }
    }
    function getRandomPlatformSpawnEnemy(){
        const validAreas=[...platforms.filter(p=>p.canSpawnEnemy),Ground];
        if(validAreas.length===0) return null;
        const area=validAreas[Math.floor(Math.random()*validAreas.length)];
        return {
            x:area.x+Math.random()*(area.width-50),
            y:area.y-50,
            minX:area.x,
            maxX:area.x+area.width-50
        };
    }
    function spawnEnemy(cnt){
        for(let i=0;i<cnt;i++){
            const spawnPoint=getRandomPlatformSpawnEnemy();
            if(spawnPoint){
                enemies.push(new Enemy(canvas.width,canvas.height,spawnPoint));
            }
        }
    }
    spawnEnemy(3);
    function handleEnemies(){
        const playerAttackBox=player.getAttackBox();
        enemies=enemies.filter(enemy=>(!enemy.isdead)&&enemy.hp>0);
        enemies.forEach(enemy =>{
            enemy.draw(ctx);
            enemy.update();

            if(playerAttackBox&&isColliding(playerAttackBox,enemy)
            &&!player.attackedEnemyIds.has(enemy.id)&&!enemy.isInvulnerable){
                player.attackedEnemyIds.add(enemy.id);
                enemy.takeDamage(player.attackDamage);
                ctx.save();
                ctx.strokeStyle='red';
                ctx.lineWidth=4;
                ctx.strokeRect(enemy.x,enemy.y,enemy.width,enemy.height);
                ctx.restore();
            }
        })
    }
    function isColliding(a,b){
        return(
            a.x<b.x+b.width&&
            a.x+a.width>b.x&&
            a.y<b.y+b.height&&
            a.y+a.height>b.y
        );
    }
    const input = new InputHandler();
    const player = new Player(canvas.width, canvas.height);
    function drawPlatforms(ctx, platforms) {
        ctx.save();
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 10;
        for (let p of platforms) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.width, p.y);
            ctx.stroke();
        }
        ctx.restore();
    }
    function drawWalls(ctx, walls) {
        ctx.save();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 10;
        for (let w of walls) {
            ctx.beginPath();
            ctx.moveTo(w.x, w.y);
            ctx.lineTo(w.x, w.y + w.height);
            ctx.stroke();
        }
        ctx.restore();
    }
    function drawDashCooldownBar(ctx, player, canvas) {
        if(player.dashCooldown>0){
            const barMaxWidth = 200;
            const barHeight = 20;
            const barX = 20;
            const barY = canvas.height - 40;
            const percent = player.dashCooldown / player.dashCooldownMax;
            const barWidth = barMaxWidth * percent;
            ctx.save();
            ctx.fillStyle = '#f7f4f4ff';
            ctx.fillRect(barX, barY, barMaxWidth, barHeight);
            ctx.fillStyle = '#8e8a8aff';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barMaxWidth, barHeight);
            ctx.font = "18px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "left";
            ctx.fillText(
                ' ',
                barX,
                barY - 5
            );
            ctx.restore();
        }
    }
    let lastTime=0;
    let maxGameFrameRate=60;
    const targetFrameTime=1000/maxGameFrameRate;
    function animate(currentTime){
        if(!lastTime) lastTime=currentTime;
        const deltaTime=currentTime-lastTime;
        if(deltaTime>=targetFrameTime){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawPlatforms(ctx, platforms);
            drawWalls(ctx, walls);
            player.draw(ctx);
            player.update(input);
            handleEnemies();
            drawDashCooldownBar(ctx, player, canvas);
            
            lastTime=currentTime-(deltaTime%targetFrameTime);
        }
        
        requestAnimationFrame(animate);
    }
    animate(0);
});