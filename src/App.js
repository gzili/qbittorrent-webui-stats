import React from 'react';
import ReactDOMServer from 'react-dom/server';

import moment from 'moment';

import 'react-tabulator/css/tabulator_site.min.css';
import 'react-tabulator/lib/styles.css';
import { ReactTabulator } from 'react-tabulator';

import { FontAwesomeIcon as FAIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faTrash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';

import './App.css';

function formatDate(unixSecs) {
  return moment.unix(unixSecs).format('YYYY-MM-DD HH:mm:ss');
}

function bytesToUnits(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let p = 0;
  while (Math.pow(1024, p) <= bytes) ++p;
  return (p > 0) ? `${parseFloat((bytes / Math.pow(1024, p - 1)).toFixed(2))} ${units[p - 1]}` : `${bytes} B`;
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
    this.rowMenu = [
      {
        label: `${deleteIcon} Delete torrent`,
        action: props.onTorrentDelete,
      }
    ];
    this.columns = [
      {title: 'Name', field: 'name'},
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
          layout: 'fitDataFill',
          rowContextMenu: this.rowMenu,
        }}
        />
    );
  }
}

function DetailsValue(props) {
  return <div className='detailsValue'>{props.children}</div>;
}

function TorrentActivityView(props) {
  const detailsKeys = ['Size', 'Added on', 'Uploaded', 'Time Active', 'Last activity'];

  const addedDate = moment.unix(props.data.added_on);
  let iterDate = moment();

  let daysObj = {};
  let days = [];
  let dayCount = 0;

  while (iterDate.isSameOrAfter(addedDate, 'day') && dayCount < 10) {
    const day = iterDate.format('YYYY-MM-DD');
    daysObj[day] = [];
    days.push(day);
    ++dayCount;
    iterDate.subtract(1, 'day');
  }

  for (let i = props.data.activity.length - 1; i >= 0; --i) {
    const item = props.data.activity[i];
    let itemDate = moment.unix(item.timestamp);
    if (itemDate.hour() === 0 && itemDate.minute() === 0) itemDate.subtract(1, 'day');
    const key = itemDate.format('YYYY-MM-DD');
    if (daysObj.hasOwnProperty(key)) daysObj[key].push(item);
    else break;
  }

  let statsArray = [];
  let lastDayAmount = null;
  let last10Days = 0;
  days.reverse();
  const addedDateKey = addedDate.format('YYYY-MM-DD');
  for (let day of days) {
    const items = daysObj[day];
    let dayTotal = 0;
    if (items.length > 0) {
      if (addedDateKey === day) dayTotal = items[0].uploaded;
      else {
        dayTotal = items[0].uploaded - items[items.length - 1].uploaded;
        if (lastDayAmount !== null) dayTotal += items[items.length - 1].uploaded - lastDayAmount;
      }
      lastDayAmount = items[0].uploaded;
    }
    statsArray.push({
      date: day,
      uploaded: dayTotal,
    });
    last10Days += dayTotal;
  }
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
            <DetailsValue>
              {bytesToUnits(props.data.lastChange.uploaded)}
              {last10Days !== props.data.lastChange.uploaded && ` (${bytesToUnits(last10Days)} in last 10 days)`}
            </DetailsValue>
            <DetailsValue>{secsToTime(props.data.lastChange.time_active)}</DetailsValue>
            <DetailsValue>{formatDate(props.data.last_activity)}</DetailsValue>
          </div>
        </div>
      </header>
      <section className='activitySection'>
        <h2 className='activitySectionName'>Last 10 days</h2>
        <ResponsiveContainer width='100%' height={500}>
          <BarChart data={statsArray} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} stroke='#ECEFF1' />
            <XAxis dataKey='date' tickLine={false} tick={{ fill: '#90A4AE' }} axisLine={false} />
            <YAxis width={90} tickLine={false} axisLine={false} tickFormatter={ v => bytesToUnits(v) } tick={{ fill: '#90A4AE' }} />
            <Bar dataKey='uploaded' fill='#2979FF' radius={[5, 5, 0, 0]}>
              <LabelList dataKey='uploaded' position='top' formatter={v => bytesToUnits(v) } fill='#90A4AE' />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
  deleteTorrent(e, row) {
    const hash = row.getData().hash;
    fetch('/delete', {
      method: 'POST',
      body: hash,
    }).then(response => {
      if (response.ok) {
        this.scrollY = window.scrollY;
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
        this.currentSecs = moment().minute(0).second(0).unix();
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
