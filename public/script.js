const socket = io("/");
//getElementById used to get an element with a unique id
const videoGrid = document.getElementById("video-grid");
// creates a new element with the given name
// video is a predefined element in html
const myVideo = document.createElement("video");
//queryselector is used when the element does not have a unique id
// elements are available in room.ejs
// # used when finding the element by id
const showChat = document.querySelector("#showChat");
// the foll line will return the first element with the class as header__back
const backBtn = document.querySelector("#back");
//video element has an attribute muted which will mute the video
myVideo.muted = true;

//backBtn is the event target which in itself is a element
//addEventListner sets up a function that will be called when the event specified
//inside it is delivered to the target
backBtn.addEventListener("click", () => {
  //setting the style display properties=how they will be displayed 
  //all the elements with the class as main-right and header-back will not be displayed
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
  showChat.style.display="flex";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".header__back").style.display = "flex";
  showChat.style.display="none";
});

const user = prompt("Enter your name");

var peer = new Peer(undefined, {});

let myVideoStream;
navigator.mediaDevices
//prompts the user for permission to use a media input if not found then error
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);
    //following lines are used to answer calls 
    //peerJS gives us a stream event which you can use on the call that you've to answer
    peer.on("call", (call) => {
      //stream=stream on which the call is answered, once answered only then
      //connection is established
      //if no media stream is specified one-way call is established
      //if call is true, you'll want to call peerJS’s answer() 
      //function on the call to create an answer, passing it the local stream.
      call.answer(stream);
      const video = document.createElement("video");
      //peerJS gives us a stream event which you can use on the call that you've
      //received. When a call starts streaming, you need to ensure that the remote 
      //stream coming from the call is assigned to the correct HTML elements 
      //and window, this is where you'll do that.
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });
    //Start listening for socket events from server with the specified eventName. 
    //Triggers the provided callback function when a matching event is received.
    socket.on("new-user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

const connectToNewUser = (userId, stream) => {
  //peer.call creates a call. here stream is the clients local stream
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
};

//this is used to pass the unique peer id between functions and files
peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, user);
});

//this functio is used to append a video in the clients html
const addVideoStream = (video, stream) => {
  // returns the source object of the media stream
  video.srcObject = stream;
  //The loadedmetadata event is fired when the metadata has been loaded.
  video.addEventListener("loadedmetadata", () => {
    video.play();
    // the following line of code comes into use when a user disconnects from
    // the room, we have its unique id stored which will help us remove the 
    // disconnected video from all the other user's html
    video.id=stream.id;
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message"); // input container
let send = document.getElementById("sendBtn"); // send button created
let messages = document.querySelector(".messages"); //conversation container

// here the eventlistener will respond to click on the send button
// it will emit an event named message to the server and the message value 
// is then sent to all the users html
send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

//send message functionality is implemented with enter key also
text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

const inviteBtn = document.querySelector("#inviteButton");
const muteBtn = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");

//mute button is a toggle button 
// if the audio is enabled then it disables the audio and changes the appearance
// of the icon and if audio is disabled then it enables it and changes the appearance
//back to the original
muteBtn.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    //changing icon the button
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteBtn.classList.toggle("background__red");
    muteBtn.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteBtn.classList.toggle("background__red");
    muteBtn.innerHTML = html;
  }
});

// stop video is a toggle button as well, it enables/disables the video and 
//changes the appearance of the icon
stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

//when the invite button is clicked it gives a prompt to the user with the url 
// of the room
inviteBtn.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});

//when a user wants to leave the meeting, they click on the close button
// that event is read by this function and is emitted to all the other users in 
// the room with the videoid of the user which is leaving  
window.addEventListener("beforeunload", function (e){
  e.preventDefault();
  e.returnValue='';
  socket.emit("client_disconnected", ROOM_ID, myVideoStream.id);
});

//the video id of the user that is disconnecting is sent to all the other users
//so that they can remove the video of the disconnected user
socket.on("remove_disconnected_video", (id_vid) => {
  document.getElementById(id_vid).remove();
});

//reads the creatMessage event sent by the server and the message sent is displayed
socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${
          userName === user ? "me" : userName
        }</span> </b>
        <span>${message}</span>
    </div>`;
});
