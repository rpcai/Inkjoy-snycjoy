export type SessionState = {
  inkjoy: {
    connected: boolean;
    region?: "global" | "mainland";
    expireAt?: string;
    uid?: string;
  };
  google: {
    connected: boolean;
    configured: boolean;
    clientId?: string;
    expiresAt?: number;
    expired?: boolean;
  };
};

export type Device = {
  deviceId: string;
  deviceName?: string;
  status?: string;
  orientation?: number;
  lastPlayThumbnailUrl?: string;
  resolution?: {
    width?: number;
    height?: number;
  };
};

export type Album = {
  albumId: string;
  albumName?: string;
  coverImg?: string;
  coverImgThumbnail?: string;
  owner?: string;
  imgCount?: number;
};

export type AlbumPhoto = {
  imgId: string;
  originUri?: string;
  originUrl?: string;
  thumbnailUrl?: string;
};

export type Carousel = {
  strategyId: string;
  deviceId?: string;
  device?: Device;
  strategyType?: string;
  updateType?: "FIXED" | "INTERVAL";
  updateDays?: number;
  updateTimeList?: string[];
  beginTime?: string;
  endTime?: string;
  intervalMinutes?: number;
  playOrder?: "SEQUENTIALLY" | "SHUFFLE";
  status?: "ACTIVE" | "INACTIVE";
  playNow?: boolean;
  idle?: 0 | 1;
  timezone?: string;
  albumIdList?: string[];
  albumList?: Album[];
  imgCount?: number;
  widgetKey?: string;
};

export type PickerSession = {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: {
    pollInterval?: string;
    timeoutIn?: string;
  };
};

export type PickedMediaItem = {
  id: string;
  createTime?: string;
  type?: string;
  mediaFile?: {
    baseUrl: string;
    filename?: string;
    mimeType?: string;
  };
};

export type ImportResult = {
  imported: number;
  skipped: number;
  results: Array<{
    id: string;
    status: "imported" | "failed";
    error?: string;
  }>;
};
