import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import moment from 'moment';

function formatDate(unixSecs) {
  return moment.unix(unixSecs).format('YYYY-MM-DD HH:mm:ss');
}

function formatBytes(bytes) {
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

/*function getUploadedBytesInLast10Days(data) {
  const addedDate = moment.unix(data.added_on);
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

  for (let i = data.activity.length - 1; i >= 0; --i) {
    const item = data.activity[i];
    let itemDate = moment.unix(item.timestamp);
    if (itemDate.hour() === 0 && itemDate.minute() === 0) itemDate.subtract(1, 'day');
    const key = itemDate.format('YYYY-MM-DD');
    if (daysObj.hasOwnProperty(key)) daysObj[key].push(item);
    else break;
  }

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
    last10Days += dayTotal;
  }

  return last10Days;
}*/

function descendingComparator(a, b, orderBy) {
  let lval = a;
  let rval = b;

  // Traverse nested object
  orderBy.split('.').forEach((id) => {
    lval = lval[id];
    rval = rval[id];
  });

  if (lval < rval) {
    return -1;
  }
  if (lval > rval) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'name', numeric: false, label: 'Name' },
  { id: 'size', numeric: true, label: 'Size' },
  { id: 'lastChange.uploaded', numeric: true, label: 'Uploaded' },
  { id: 'last10Days.bytes', numeric: true, label: '10 Days' },
  { id: 'last10Days.ratio', numeric: true, label: '10 Days Ratio' },
  { id: 'lastChange.time_active', numeric: true, label: 'Time Active'},
  { id: 'added_on', numeric: true, label: 'Added On'},
  { id: 'last_activity', numeric: true, label: 'Last Activity'}
];

function EnhancedTableHead(props) {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => () => onRequestSort(property);

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
};

const useStyles = makeStyles((theme) => ({
  tableContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    overflowY: 'auto',
    backgroundColor: '#fff',
    borderRadius: theme.shape.borderRadius,
  },
}));

export default function TorrentsTable(props) {
  const {
    data
  } = props;

  const {
    timestamp,
    rows
  } = data;

  const classes = useStyles();
  const [order, setOrder] = React.useState('desc');
  const [orderBy, setOrderBy] = React.useState('added_on');

  const handleRequestSort = property => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <TableContainer className={classes.tableContainer}>
      <Table size='small' stickyHeader>
        <EnhancedTableHead
          order={order}
          orderBy={orderBy}
          onRequestSort={handleRequestSort}
        />
        <TableBody>
          {stableSort(rows, getComparator(order, orderBy))
            .map(row => (
                <TableRow key={row.hash} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{formatBytes(row.size)}</TableCell>
                  <TableCell align="right">{formatBytes(row.lastChange.uploaded)}</TableCell>
                  <TableCell align="right">{formatBytes(row.last10Days.bytes)}</TableCell>
                  <TableCell align="right">{row.last10Days.ratio}</TableCell>
                  <TableCell align="right">{secsToTime(row.lastChange.time_active)}</TableCell>
                  <TableCell align="right">{formatDate(row.added_on)}</TableCell>
                  <TableCell align="right">{secsToTime(row.last_activity, timestamp)}</TableCell>
                </TableRow>
              )
            )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}