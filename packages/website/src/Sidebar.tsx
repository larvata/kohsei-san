import React, { useReducer } from 'react';
import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import DeleteIcon from '@material-ui/icons/Delete';
import InfoIcon from '@material-ui/icons/Info';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import TwitterIcon from '@material-ui/icons/Twitter';
import { v4 as uuidv4 } from 'uuid';
import { Memo, MemosAction } from './useMemo';

const DrawerContainer = styled.div`
  width: 250px;
`;

const MemoText = styled(ListItemText)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export interface SidebarProps {
  dispatchMemoId: React.Dispatch<string>;
  dispatchMemos: React.Dispatch<MemosAction>;
  memoId: string;
  memos: Memo[];
  onClose?: () => void;
}

const Sidebar: React.FunctionComponent<SidebarProps> = ({
  dispatchMemoId,
  dispatchMemos,
  memoId,
  memos,
  onClose,
}) => {
  const [deleteMemo, dispatchDeleteMemo] = useReducer(
    (prevDeleteMemo: { id?: string; memo?: Memo }, id: string | undefined) => ({
      id,
      memo: memos.find((memo) => memo.id === id) || prevDeleteMemo.memo,
    }),
    { id: undefined, memo: undefined }
  );

  const handleAddClick: React.MouseEventHandler = () => {
    const id = uuidv4();

    dispatchMemos((prevMemos) => [
      ...prevMemos,
      {
        id,
        text: '',
      },
    ]);

    dispatchMemoId(id);

    if (onClose) {
      onClose();
    }
  };

  const handleDeleteDialogAgree: React.MouseEventHandler = () => {
    dispatchDeleteMemo(undefined);
    dispatchMemos((prevMemos) => prevMemos.filter(({ id }) => id !== deleteMemo.id));
  };

  const handleDeleteDialogClose = () => dispatchDeleteMemo(undefined);

  const handleLicenseClick: React.MouseEventHandler = () =>
    window.open('https://github.com/blue-hood/kohsei-san/blob/master/README.md');

  const handleDeleteClick = (id: string) => dispatchDeleteMemo(id);

  const handleMemoClick = (id: string) => {
    dispatchMemoId(id);

    if (onClose) {
      onClose();
    }
  };

  const handleTwitterClick: React.MouseEventHandler = () =>
    window.open('https://twitter.com/hata6502');

  return (
    <DrawerContainer>
      <List>
        {memos.map(({ id, text }) => (
          <ListItem button key={id} onClick={() => handleMemoClick(id)} selected={id === memoId}>
            <MemoText primary={text.trim() || '(空のメモ)'} />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleDeleteClick(id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}

        <ListItem button onClick={handleAddClick}>
          <ListItemIcon>
            <NoteAddIcon />
          </ListItemIcon>
          <ListItemText primary="メモを追加" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleTwitterClick}>
          <ListItemIcon>
            <TwitterIcon />
          </ListItemIcon>
          <ListItemText primary="Twitter" />
        </ListItem>

        <ListItem button onClick={handleLicenseClick}>
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <ListItemText primary="このアプリについて" />
        </ListItem>
      </List>

      <Dialog open={Boolean(deleteMemo.id)} onClose={handleDeleteDialogClose}>
        <DialogTitle>
          メモ「
          {(deleteMemo.memo?.text.trim() || '(空のメモ)').substring(0, 10)}
          {((deleteMemo.memo?.text.trim().length || 0) > 10 && '…') || ''}
          」を削除しますか？
        </DialogTitle>

        <DialogContent>
          <DialogContentText>削除を元に戻すことはできません。</DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleDeleteDialogClose} color="primary" autoFocus>
            いいえ
          </Button>

          <Button onClick={handleDeleteDialogAgree} color="primary">
            はい
          </Button>
        </DialogActions>
      </Dialog>
    </DrawerContainer>
  );
};

export default Sidebar;
