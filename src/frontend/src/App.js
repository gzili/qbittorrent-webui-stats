import React from 'react';
import './App.css';

import 'react-tabulator/css/tabulator_site.min.css';
import 'react-tabulator/lib/styles.css';
import { ReactTabulator } from 'react-tabulator';

import { FontAwesomeIcon as FAIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

function zeroPad(x) {
  return (x >= 10) ? x : '0' + x;
}

function formatDate(cell) {
  // let shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let date = new Date(cell.getValue() * 1000);
  let dd = zeroPad(date.getDate());
  let MM = zeroPad(date.getMonth()+1);
  let yyyy = date.getFullYear();
  let h = date.getHours();
  let mm = zeroPad(date.getMinutes());
  let ss = zeroPad(date.getSeconds());
  // let shortMonth = shortMonths[date.getMonth()];
  return `${yyyy}-${MM}-${dd} ${h}:${mm}:${ss}`;
}

function bytesToUnits(cell) {
  let bytes = cell.getValue();
  let units = ['bytes', 'KB', 'MB', 'GB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}`;
}

function secsToTime(cell) {
  let secs = cell.getValue();

  let s = secs % 60;
  secs = Math.floor(secs / 60);
  let m = secs % 60;
  secs = Math.floor(secs / 60);
  let h = secs % 60;
  secs = Math.floor(secs / 24);
  let d = secs;

  let str = '';
  if (d) str += d + 'd ';
  if (h) str += h + 'h ';
  if (!d && m) str += m + 'm ';
  if (!h && s) str += s + 's';

  return str;
}

function MainView(props) {
  return (
    <div className='mainViewContainer'>
      <div className='loadingIcon'>
        <FAIcon icon={faCircleNotch} spin />
      </div>
      <div className='loadingText'>Fetching data</div>
    </div>
  );
}

function TorrentListView(props) {
  const columns = [
    {title: 'Name', field: 'name', widthGrow: 2},
    {title: 'Size', field: 'size', formatter: bytesToUnits},
    {title: 'Uploaded', field: 'lastChange.uploaded', formatter: bytesToUnits},
    {title: 'Time Active', field: 'lastChange.time_active', formatter: secsToTime},
    {title: 'Added on', field: 'added_on', formatter: formatDate},
    {title: 'Last Activity', field: 'last_activity', formatter: formatDate},
  ];
  return (
    <ReactTabulator
      data={props.data}
      columns={columns}
      layout='fitData'
      initialSort={[{column: 'added_on', dir: 'desc'}]}
      rowClick={props.onRowClick}
      />
  );
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false,
    };
    this.handleRowClick = this.handleRowClick.bind(this);
    this.handleBackClick = this.handleBackClick.bind(this);
  }
  handleRowClick(e, row) {
    this.setState({
      currentItem: row.getData(),
    });
  }
  handleBackClick() {
    this.setState({
      currentItem: null,
    });
  }
  fetchData() {
    fetch('/stats.json').then(response => {
      response.json().then(data => {
        for (let row of data) {
          row.lastChange = row.activity[row.activity.length - 1];
        }
        this.setState({
          isLoaded: true,
          data: data,
        });
      })
    })
  }
  componentDidMount() {
    this.fetchData();
  }
  render() {
    if (this.state.isLoaded) {
      if (this.state.currentItem) {
        return (
          <div>
            <p>
              Torrent: {this.state.currentItem.name}<br />
              <button onClick={this.handleBackClick}>Back to torrents list</button>
            </p>
          </div>
        )
      }
      else {
        return (
          <TorrentListView
            data={this.state.data}
            onRowClick={this.handleRowClick}
          />
        )
      }
    }
    else {
      return <MainView />;
    }
  }
}

export default App;
