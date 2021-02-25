//connect the client side to socket.io
const socket = io();

//Elements
const $messageForm = document.querySelector("#form-message");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $locationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector('#sidebar')

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//Options
//ignoreQueryPrefix (ignore query cuestion mark)
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

const autoScroll = () => {
	// New message element
	const $newMessage = $messages.lastElementChild

	// Height of the new message
	const newMessageStyles = getComputedStyle($newMessage)
	const newMessageMargin = parseInt(newMessageStyles.marginBottom)
	const newMessageHeight = $newMessage.offsetHeight + newMessageMargin 
	
	//visible height
	const visibleHeight = $messages.offsetHeight

	//Height of messages container
	const containerHeight = $messages.scrollHeight

	//How far have i scrolled?
	const scrollOfset = $messages.scrollTop + visibleHeight

	if(containerHeight - newMessageHeight <= scrollOfset) {
		$messages.scrollTop = $messages.scrollHeight
	}
}

socket.on("message", (message) => {
	console.log(message);
	const html = Mustache.render(messageTemplate, {
		username: message.username,
		message: message.text,
		createdAt: moment(message.createdAt).format('h:mm a'),
	});
	$messages.insertAdjacentHTML("beforeend", html);
	autoScroll()
});

socket.on("locationMessage", (location) => {
	console.log(location);
	const html = Mustache.render(locationTemplate, {
		username: location.username,
		location: location.url,
		createdAtLocation: moment(location.createdAt).format("h:m a"),
	});
	$messages.insertAdjacentHTML("beforeend", html);
	autoScroll()
});

socket.on('roomData', ({room, users}) => {
	const html = Mustache.render(sidebarTemplate, {
		room,
		users
	})
	$sidebar.innerHTML = html
})

$messageForm.addEventListener("submit", (e) => {
	e.preventDefault();

	//disable form button
	$messageFormButton.setAttribute("disabled", "disabled");
	const formInput = e.target.elements.message.value;
	//callback function to receive acknowledge
	socket.emit("newMessage", formInput, (error) => {
		//enable form button
		$messageFormButton.removeAttribute("disabled");

		$messageFormInput.value = "";
		$messageFormInput.focus();

		if (error) {
			return console.log(error);
		}

		console.log("The message was delivered");
	});
});

$locationButton.addEventListener("click", () => {
	if (!navigator.geolocation) {
		return alert("Geolocation is not suported by your browser");
	}
	$locationButton.setAttribute("disabled", "disabled");
	//using mdn api geolocation
	navigator.geolocation.getCurrentPosition((position) => {
		socket.emit(
			"location",
			{
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
			},
			(acknowledge) => {
				$locationButton.removeAttribute("disabled");

				console.log(acknowledge);
			}
		);
	});
});

socket.emit('join', {username, room}, (error) => {
	if(error) {
		alert(error)
		location.href = '/'
	}
})

//receive an event from the server
// socket.on('countUpdated', (count) => {
//   console.log('the count has been updated! ' + count)
// })

//sent an event to the server
// document.querySelector('#increment').addEventListener('click', () => {
//   console.log('Clicked')
//   socket.emit('increment')
// })
