import React, { useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

import moment from 'moment';

import { makeStyles, useTheme as useMuiTheme } from '@material-ui/core/styles';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Select,
  MenuItem
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';

import {
  useTheme,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Text,
  Heading,
  Box,
  Flex,
} from '@chakra-ui/react';

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';

import { deleteTorrent } from './adapters';
import { formatBytes, getTorrentStatsByDay } from './utils';

function formatDate(unixSecs) {
  return moment.unix(unixSecs).format('YYYY-MM-DD HH:mm:ss');
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

function descendingComparator(a, b, orderBy) {
  let lval = a;
  let rval = b;

  // Traverse nested object
  orderBy.split('.').forEach((id) => {
    lval = lval[id];
    rval = rval[id];
  });

  if (rval < lval) {
    return -1;
  }
  if (rval > lval) {
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
  return stabilizedThis.map(el => el[0]);
}

const DeleteDialog = props => {
  const {
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isPending
  } = props;

  const initialFocusRef = useRef();

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={initialFocusRef}
      onClose={onClose}
      closeOnEsc={!isPending}
      closeOnOverlayClick={!isPending}
      returnFocusOnClose={false}
      isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Delete Torrent
            </AlertDialogHeader>
            <AlertDialogBody>
              Delete <b>{itemName}</b>?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onClose} isDisabled={isPending}>Cancel</Button>
              <Button colorScheme='red' ml={3} ref={initialFocusRef} onClick={onConfirm} isLoading={isPending}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
  );
}

const useRowStyles = makeStyles(theme => ({
  root: {
    '& > *': {
      borderBottom: 'unset',
    },
  },
  leftCell: {
    paddingLeft: 0,
  },
  rightCell: {
    paddingRight: 0,
  },
  iconCell: {
    padding: '0 8px !important',
  },
  icon: {
    fontSize: 20,
  },
  grayText: {
    color: theme.palette.grey['500'],
  },
}));

const headCells = [
  { id: 'name', numeric: false, cls: 'leftCell', label: 'Name' },
  { id: 'size', numeric: true, label: 'Size' },
  { id: 'lastChange.uploaded', numeric: true, label: 'Uploaded' },
  { id: 'last10Days.bytes', numeric: true, label: '10 Days' },
  { id: 'last10Days.ratio', numeric: true, label: '10 Days Ratio' },
  { id: 'lastChange.time_active', numeric: true, label: 'Time Active'},
  { id: 'last_activity', numeric: true, label: 'Last Activity'},
  { id: 'added_on', numeric: true, cls: 'rightCell', label: 'Added on'},
];

function EnhancedTableHead(props) {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => () => onRequestSort(property);

  const classes = useRowStyles();

  return (
    <TableHead>
      <TableRow>
        <TableCell />
        {headCells.map(headCell => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
            className={classes[headCell.cls]}
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
        <TableCell />
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
};

const ActivityChart = props => {
  const { row } = props;

  const theme = useTheme();
  const materialGrey = useMuiTheme().palette.grey;

  const [daysToShow, setDaysToShow] = useState(10);

  const handleChange = e => {
    setDaysToShow(e.target.value);
  }

  const { stats, total } = getTorrentStatsByDay(row, daysToShow);

  return (
    <Box p={4}>
      <Flex justify='space-between' align='center'>
        <Heading as='h2' fontSize='xl' mb={2}>Activity in last {daysToShow} days ({formatBytes(total)} total)</Heading>
        <Flex align='center'>
          <Text mr={2}>Days to show:</Text>
          <Select value={daysToShow} onChange={handleChange}>
            <MenuItem value={7}>7</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={30}>30</MenuItem>
          </Select>
        </Flex>
      </Flex>
      <ResponsiveContainer width='100%' height={400}>
        <BarChart data={stats} margin={{ top: 20 }}>
          <CartesianGrid vertical={false} stroke={materialGrey['200']} />
          <XAxis dataKey='date' tickLine={false} tick={{ fill: materialGrey['600'] }} axisLine={false} />
          <YAxis width={90} tickLine={false} axisLine={false} tickFormatter={ v => formatBytes(v) } tick={{ fill: materialGrey['600'] }} />
          <Bar dataKey='uploaded' fill={theme.colors.teal['500']} radius={[5, 5, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey='uploaded' position='top' formatter={v => formatBytes(v) } fill={materialGrey['600']} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

const ExpandableTableRow = props => {
  const {
    row,
    timestamp,
    setTargetItem,
  } = props;

  const [open, setOpen] = React.useState(false);

  const classes = useRowStyles();

  return (
    <>
      <TableRow className={classes.root} hover>
        <TableCell className={classes.iconCell}>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon className={classes.icon} /> : <KeyboardArrowDownIcon className={classes.icon} />}
          </IconButton>
        </TableCell>
        <TableCell className={classes.leftCell}>{row.name}</TableCell>
        <TableCell align="right">{formatBytes(row.size)}</TableCell>
        <TableCell align="right">{formatBytes(row.lastChange.uploaded)}</TableCell>
        <TableCell
          align="right"
          className={(row.last10Days.bytes === row.lastChange.uploaded) ? classes.grayText : null}
        >
          {formatBytes(row.last10Days.bytes)}
        </TableCell>
        <TableCell align="right">{row.last10Days.ratio}</TableCell>
        <TableCell align="right">{secsToTime(row.lastChange.time_active)}</TableCell>
        <TableCell align="right">{secsToTime(row.last_activity, timestamp)}</TableCell>
        <TableCell align="right" className={classes.rightCell}>{formatDate(row.added_on)}</TableCell>
        <TableCell align="right" className={classes.iconCell}>
          <IconButton size='small' onClick={() => setTargetItem(row)}>
            <DeleteIcon className={classes.icon} />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell padding='none' colSpan={headCells.length + 2}>
          { open && <ActivityChart row={row} /> }
        </TableCell>
      </TableRow>
    </>
  );
}

const useTableStyles = makeStyles({
  tableContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    overflowY: 'auto',
    backgroundColor: '#fff',
    borderRadius: '0.375rem', // radii.md
  },
});

export default function TorrentsTable(props) {
  const {
    data,
    refresh
  } = props;

  const {
    timestamp,
    rows
  } = data;

  const classes = useTableStyles();

  const [order, setOrder] = React.useState('desc');
  const [orderBy, setOrderBy] = React.useState('added_on');

  const handleRequestSort = property => {
    const isAsc = (orderBy === property) && (order === 'asc');
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const [targetItem, setTargetItem] = useState(null);
  const [isDeletePending, setDeletePending] = useState(false);

  const closeDeleteDialog = () => setTargetItem(null);

  const onDelete = useCallback(() => {
    setDeletePending(true);

    deleteTorrent(targetItem.hash).then(() => {
      closeDeleteDialog();
    }).finally(() => {
      setTargetItem(null);
      setDeletePending(false);
      refresh();
    });
  }, [targetItem, refresh]);

  return (
    <>
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
                <ExpandableTableRow key={row.hash} row={row} timestamp={timestamp} setTargetItem={setTargetItem} />
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <DeleteDialog
        isOpen={targetItem != null}
        isPending={isDeletePending}
        onClose={closeDeleteDialog}
        onConfirm={onDelete}
        itemName={targetItem && targetItem.name}
      />
    </>
  );
}