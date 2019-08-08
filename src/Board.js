import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

export default class Board extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			clients: {
				backlog: [],
				inProgress: [],
				complete: []
			}
		};
		this.swimlanes = {
			backlog: React.createRef(),
			inProgress: React.createRef(),
			complete: React.createRef()
		};
		this.statusMap = {
			backlog: 'backlog',
			'in-progress': 'inProgress',
			complete: 'complete'
		};
		this.apiBase = 'http://localhost:3001/api/v1/clients/';
	}

	renderSwimlane(name, clients, ref, status) {
		return <Swimlane name={name} clients={clients} dragulaRef={ref} status={status} />;
	}

	componentDidMount() {
		let containers = [ this.swimlanes.backlog, this.swimlanes.inProgress, this.swimlanes.complete ];
		containers = containers.map((el) => {
			return el.current;
		});
		this.drake = Dragula(containers).on('drop', (el, target, source, sibling) =>
			this.updateCard(el, target, source, sibling)
		);

		this.getClients();
	}

	componentWillUnmount() {
		this.drake.remove();
	}

	getClients() {
		let clients = [];
		fetch(this.apiBase)
			.then((response) => {
				if (response.status !== 200) {
					console.log('Looks like there was a problem. Status Code: ' + response.status);
					return;
				}
				response
					.json()
					.then(function(data) {
						clients = data;
						// order by priority
						clients = clients.sort((a, b) => (a.priority > b.priority ? 1 : -1));
					})
					.then(() => {
						this.setState({
							clients: {
								backlog: clients.filter((client) => !client.status || client.status === 'backlog'),
								inProgress: clients.filter(
									(client) => client.status && client.status === 'in-progress'
								),
								complete: clients.filter((client) => client.status && client.status === 'complete')
							}
						});
					});
			})
			.catch((err) => {
				console.log('Fetch Error :-S', err);
			});
	}

	updateCard(el, target, source, sibling) {
		// Revert changes made in the DOM by Dragula
		this.drake.cancel(true);

		var clients = [
			...this.state.clients.backlog,
			...this.state.clients.inProgress,
			...this.state.clients.complete
		];

		var oldIndex = clients.findIndex((client) => client.id == el.getAttribute('data-id'));
		clients[oldIndex].status = target.getAttribute('status');

		const siblingIndex = sibling ? clients.findIndex((client) => client.id == sibling.getAttribute('data-id')) : 0;
		const newIndex = sibling ? (siblingIndex < oldIndex ? siblingIndex : siblingIndex - 1) : clients.length - 1;
		this.arraymove(clients, oldIndex, newIndex);

		clients = {
			backlog: clients.filter((client) => !client.status || client.status === 'backlog'),
			inProgress: clients.filter((client) => client.status && client.status === 'in-progress'),
			complete: clients.filter((client) => client.status && client.status === 'complete')
		};

		for (let key in clients) {
			clients[key].forEach((client, i) => {
				client.priority = i + 1;
				this.putClient(client);
			});
		}

		this.setState({
			clients
		});
	}

	putClient(client) {
		fetch(this.apiBase + client.id, {
			method: 'put',
			headers: {
				'Content-type': 'application/json'
			},
			body: JSON.stringify({
				status: client.status,
				priority: client.priority
			})
		})
			.then((response) => {
				if (response.status !== 200) {
					console.log('Looks like there was a problem. Status Code: ' + response.status);
					return;
				}
				response.json().then(function(data) {
					//console.log(data);
				});
			})
			.catch((err) => {
				console.log('Fetch Error :-S', err);
			});
	}

	arraymove(arr, fromIndex, toIndex) {
		var element = JSON.parse(JSON.stringify(arr[fromIndex]));
		arr.splice(fromIndex, 1);
		arr.splice(toIndex, 0, element);
	}

	render() {
		return (
			<div className="Board">
				<div className="container-fluid">
					<div className="row">
						<div className="col-md-4">
							{this.renderSwimlane(
								'Backlog',
								this.state.clients.backlog,
								this.swimlanes.backlog,
								'backlog'
							)}
						</div>
						<div className="col-md-4">
							{this.renderSwimlane(
								'In Progress',
								this.state.clients.inProgress,
								this.swimlanes.inProgress,
								'in-progress'
							)}
						</div>
						<div className="col-md-4">
							{this.renderSwimlane(
								'Complete',
								this.state.clients.complete,
								this.swimlanes.complete,
								'complete'
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}
}
