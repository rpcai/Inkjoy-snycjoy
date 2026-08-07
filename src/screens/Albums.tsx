import type React from "react";
import { Image, Plus } from "lucide-react";
import type { Album } from "../types";

export function AlbumsView(props: {
  albums: Album[];
  onOpenAlbum: (albumId: string) => void;
  onCreateAlbum: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="screen-header">
        <h2>Albums</h2>
        <form className="new-album-form" onSubmit={props.onCreateAlbum}>
          <input name="albumName" placeholder="Album name" />
          <button type="submit" className="btn btn-primary btn-sm">
            <Plus size={14} />
            New Album
          </button>
        </form>
      </div>

      <div className="album-grid">
        {props.albums.map((album) => (
          <button
            type="button"
            key={album.albumId}
            className="album-card"
            onClick={() => props.onOpenAlbum(album.albumId)}
          >
            <div className="album-thumb">
              {album.coverImgThumbnail || album.coverImg ? (
                <img src={album.coverImgThumbnail || album.coverImg} alt="" />
              ) : (
                <Image size={30} />
              )}
            </div>
            <div className="album-info">
              <strong>{album.albumName || "Untitled"}</strong>
              <span>🖼 {album.imgCount || 0}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
