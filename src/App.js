import React from 'react';
import ReactDOMServer from 'react-dom/server';
import './App.css';

import 'react-tabulator/css/tabulator_site.min.css';
import 'react-tabulator/lib/styles.css';
import { ReactTabulator } from 'react-tabulator';

import { FontAwesomeIcon as FAIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faTrash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, LabelList} from 'recharts';

function zeroPad(x) {
  return (x >= 10) ? x : '0' + x;
}

function formatDate(unixSeconds) {
  // let shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let date = new Date(unixSeconds * 1000);
  let dd = zeroPad(date.getDate());
  let MM = zeroPad(date.getMonth()+1);
  let yyyy = date.getFullYear();
  let hh = zeroPad(date.getHours());
  let mm = zeroPad(date.getMinutes());
  let ss = zeroPad(date.getSeconds());
  // let shortMonth = shortMonths[date.getMonth()];
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

function bytesToUnits(bytes) {
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return (p > 0) ? `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}` : `${bytes} ${units[p]}`;
}

function secsToTime(unixSecs, diffSecs) {
  const isDiff = Number.isInteger(diffSecs);
  let secs = (isDiff) ? diffSecs - unixSecs: unixSecs;

  if (secs <= 0) return 'A moment ago';

  let s = secs % 60;
  secs = Math.floor(secs / 60);
  let m = secs % 60;
  secs = Math.floor(secs / 60);
  let h = secs % 24;
  secs = Math.floor(secs / 24);
  let d = secs;

  let str = '';
  if (d) str += d + 'd ';
  if (h) str += h + 'h ';
  if (!d && m) str += m + 'm ';
  if (!h && s) str += s + 's ';
  if (isDiff) str += ' ago';

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

class TorrentListView extends React.Component {
  constructor(props) {
    super(props);
    const deleteIcon = ReactDOMServer.renderToStaticMarkup(
      <FAIcon className='contextMenuIcon' icon={faTrash} fixedWidth />
    );
    const cellMenu = [
      {
        label: `${deleteIcon} Delete torrent`,
        action: props.onTorrentDelete,
      }
    ];
    this.columns = [
      {title: 'Name', field: 'name', contextMenu: cellMenu},
      {title: 'Size', field: 'size', formatter: c => bytesToUnits(c.getValue())},
      {title: 'Uploaded', field: 'lastChange.uploaded', formatter: c => bytesToUnits(c.getValue())},
      {title: 'Time Active', field: 'lastChange.time_active', formatter: c => secsToTime(c.getValue())},
      {title: 'Added on', field: 'added_on', formatter: c => formatDate(c.getValue())},
      {title: 'Last Activity', field: 'last_activity', formatter: c =>  secsToTime(c.getValue(), this.props.currentSecs)},
    ];
  }
  render() {
    return (
      <ReactTabulator
        data={this.props.data}
        columns={this.columns}
        initialSort={this.props.initialSort}
        dataSorted={this.props.onSort}
        rowClick={this.props.onRowClick}
        dataLoaded={() => {
          window.scroll(0, this.props.scrollY);
        }}
        options = {{
          layout: 'fitDataFill'
        }}
        />
    );
  }
}

function DetailsValue(props) {
  return <div className='detailsValue'>{props.children}</div>;
}

function TorrentActivityView(props) {
  const columns = [
    {title: 'Time', field: 'timestamp', formatter: c => formatDate(c.getValue())},
    {title: 'Uploaded', field: 'uploaded', formatter: c => bytesToUnits(c.getValue())},
    {title: 'Time Active', field: 'time_active', formatter: c => secsToTime(c.getValue())},
  ];
  const detailsKeys = ['Size', 'Added on', 'Uploaded', 'Time Active', 'Last activity'];

  const addedDate = new Date(props.data.added_on * 1000);

  let iterDate = new Date();
  iterDate.setHours(23);
  iterDate.setMinutes(59);
  iterDate.setSeconds(59);
  iterDate.setMilliseconds(999);

  let daysObj = {};
  let count = 0;

  while (iterDate > addedDate && count < 10) {
    console.log(iterDate);
    const day = `${iterDate.getFullYear()}-${zeroPad(iterDate.getMonth() + 1)}-${zeroPad(iterDate.getDate())}`;
    daysObj[day] = [];
    iterDate.setDate(iterDate.getDate() - 1);
    ++count;
  }
  for (let item of props.data.activity) {
    const date = new Date(item.timestamp * 1000);
    const key = `${date.getFullYear()}-${zeroPad(date.getMonth() + 1)}-${zeroPad(date.getDate())}`;
    if (daysObj.hasOwnProperty(key)) daysObj[key].push(item);
  }

  let statsArray = [];
  for (var day in daysObj) {
    const items = daysObj[day];
    const dayTotal = (items.length === 0) ? 0 : items[items.length - 1].uploaded - items[0].uploaded;
    statsArray.push({
      date: day,
      uploaded: dayTotal,
    });
  }
  statsArray.reverse();

  if (addedDate > new Date(2020, 7, 16)) statsArray[0].uploaded += daysObj[day][0].uploaded;
  return (
    <main className='activityViewContainer'>
      <header className='itemProps'>
        <h2 className='itemName'>{props.data.name}</h2>
        <small className='itemHash'>{props.data.hash}</small>
        <div className='itemDetails'>
          <div className='detailsColKeys'>
            {
              detailsKeys.map((k, i) => {
                return <div key={i} className='detailsKey'>{k}</div>;
              })
            }
          </div>
          <div className='detailsColValues'>
            <DetailsValue>{bytesToUnits(props.data.size)}</DetailsValue>
            <DetailsValue>{formatDate(props.data.added_on)}</DetailsValue>
            <DetailsValue>{bytesToUnits(props.data.lastChange.uploaded)}</DetailsValue>
            <DetailsValue>{secsToTime(props.data.lastChange.time_active)}</DetailsValue>
            <DetailsValue>{formatDate(props.data.last_activity)}</DetailsValue>
          </div>
        </div>
      </header>
      <section className='activitySection'>
        <h2 className='activitySectionName'>Daily upload amount</h2>
        <ResponsiveContainer width='100%' height={500}>
          <BarChart data={statsArray} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} stroke='#ECEFF1' />
            <XAxis dataKey='date' tickLine={false} tick={{ fill: '#90A4AE' }} axisLine={false} />
            <YAxis width={90} tickLine={false} axisLine={false} tickFormatter={ v => bytesToUnits(v) } tick={{ fill: '#90A4AE' }} />
            <Bar dataKey='uploaded' fill='#2979FF'>
              <LabelList dataKey='uploaded' position='top' formatter={v => bytesToUnits(v) } fill='#90A4AE' />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className='activitySection'>
        <h2 className='activitySectionName'>Hourly statistics entries</h2>
        <ReactTabulator
          data={props.data.activity}
          columns={columns}
          options={{
            layout: 'fitDataStretch',
            headerSort: false,
          }}
        />
      </section>
      <button className='returnButtonFloating' onClick={props.onReturn}>
        <FAIcon icon={faArrowLeft} />
      </button>
    </main>
  );
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.scrollY = 0;
    this.torrentListSort = [{column: 'added_on', dir: 'desc'}];
    this.state = {
      isLoaded: false,
    };
    this.handleRowClick = this.handleRowClick.bind(this);
    this.saveSortData = this.saveSortData.bind(this);
    this.deleteTorrent = this.deleteTorrent.bind(this);
    this.handleReturn = this.handleReturn.bind(this);
  }
  handleRowClick(e, row) {
    this.scrollY = window.scrollY;
    this.setState({
      currentItem: row.getData(),
    });
  }
  saveSortData(sorters) {
    this.torrentListSort = [{
      column: sorters[0].column,
      dir: sorters[0].dir,
    }];
  }
  deleteTorrent(e, cell) {
    const hash = cell.getRow().getData().hash;
    fetch('/delete', {
      method: 'POST',
      body: hash,
    }).then(response => {
      if (response.ok) {
        this.fetchData();
      }
    });
  }
  handleReturn() {
    this.setState({
      currentItem: null,
    });
  }
  fetchData() {
    fetch('/stats', {
      cache: 'no-store',
    }).then(response => {
      response.json().then(data => {
        for (let row of data) {
          row.lastChange = row.activity[row.activity.length - 1];
        }
        const now = new Date();
        this.currentSecs = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0).getTime() / 1000);
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
          <TorrentActivityView
            data={this.state.currentItem}
            onReturn={this.handleReturn}
          />
        );
      }
      else {
        return (
          <TorrentListView
            scrollY={this.scrollY}
            data={this.state.data}
            initialSort={this.torrentListSort}
            onSort={this.saveSortData}
            onRowClick={this.handleRowClick}
            onTorrentDelete={this.deleteTorrent}
            currentSecs={this.currentSecs}
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
