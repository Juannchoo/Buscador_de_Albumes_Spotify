import './App.css';
import { FormControl, Container, Button, Row, Card, Spinner, Alert } from "react-bootstrap";
import { useState, useEffect } from "react";

const clientId = import.meta.env.VITE_CLIENT_ID;
const clientSecret = import.meta.env.VITE_CLIENT_SECRET;

function App() {
  const [searchInput, setSearchInput] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [albums, setAlbums] = useState([]);
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null); // Álbum seleccionado
  const [tracks, setTracks] = useState([]); // Canciones del álbum
  const [loadingTracks, setLoadingTracks] = useState(false); // Carga de canciones
  const [playingPreview, setPlayingPreview] = useState(null); // ID de canción reproduciéndose

  // Obtener token de Spotify al montar el componente
  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const authParams = {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body:
            "grant_type=client_credentials&client_id=" +
            clientId +
            "&client_secret=" +
            clientSecret,
        };

        const response = await fetch("https://accounts.spotify.com/api/token", authParams);
        const data = await response.json();
        
        if (data.access_token) {
          setAccessToken(data.access_token);
        } else {
          setError("No se pudo autenticar con Spotify");
        }
      } catch (err) {
        console.error("Error al obtener token:", err);
        setError("Error al conectar con Spotify");
      }
    };

    getAccessToken();
  }, []);

  // Función principal de búsqueda
  async function search() {
    // Validaciones
    if (!accessToken) {
      setError("Esperando autenticación con Spotify...");
      return;
    }

    if (!searchInput.trim()) {
      setError("Por favor ingresa un nombre de artista");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const artistParams = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
      };

      // 1. BUSCAR ARTISTA
      const artistResponse = await fetch(
        "https://api.spotify.com/v1/search?q=" + encodeURIComponent(searchInput) + "&type=artist&limit=1",
        artistParams
      );
      const artistData = await artistResponse.json();

      // Validar que existan resultados
      if (!artistData.artists || !artistData.artists.items || artistData.artists.items.length === 0) {
        setError(`No se encontró el artista "${searchInput}"`);
        setAlbums([]);
        setArtist(null);
        setLoading(false);
        return;
      }

      const artistInfo = artistData.artists.items[0];
      const artistID = artistInfo.id;

      // Guardar información del artista
      setArtist({
        name: artistInfo.name,
        image: artistInfo.images[0]?.url || "https://via.placeholder.com/300",
        genres: artistInfo.genres,
        followers: artistInfo.followers.total,
        spotifyUrl: artistInfo.external_urls.spotify,
      });

      // 2. OBTENER ÁLBUMES DEL ARTISTA
      const albumsResponse = await fetch(
        "https://api.spotify.com/v1/artists/" +
          artistID +
          "/albums?include_groups=album&market=US&limit=50",
        artistParams
      );
      const albumsData = await albumsResponse.json();

      if (albumsData.items && albumsData.items.length > 0) {
        setAlbums(albumsData.items);
      } else {
        setError("Este artista no tiene álbumes disponibles");
        setAlbums([]);
      }

      console.log("Artista:", artistInfo.name);
      console.log("ID del artista:", artistID);
      console.log("Álbumes encontrados:", albumsData.items?.length || 0);
    } catch (err) {
      console.error("Error en la búsqueda:", err);
      setError("Error al buscar. Intenta de nuevo más tarde.");
      setAlbums([]);
      setArtist(null);
    } finally {
      setLoading(false);
    }
  }

  // Función para obtener canciones de un álbum
  const fetchAlbumTracks = async (albumId) => {
    setLoadingTracks(true);
    setError("");
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      setTracks(data.items || []);
    } catch (err) {
      console.error("Error al obtener canciones:", err);
      setError("Error al cargar las canciones del álbum");
    } finally {
      setLoadingTracks(false);
    }
  };

  // Manejar click en un álbum
  const handleAlbumClick = (album) => {
    setSelectedAlbum(album);
    setTracks([]);
    fetchAlbumTracks(album.id);
  };

  // Volver a la lista de álbumes
  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setTracks([]);
    setPlayingPreview(null);
  };

  return (
    <>
      {/* HEADER */}
      <Container className="mt-5 mb-5">
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "3em", fontWeight: "bold", color: "#1DB954" }}>
            🎵 Spotify Album Finder
          </h1>
          <p style={{ fontSize: "1.2em", color: "#666" }}>
            Busca tus artistas favoritos y descubre todos sus álbumes
          </p>
        </div>

        {/* BARRA DE BÚSQUEDA */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", width: "100%" }}>
          <div style={{ display: "flex", maxWidth: "600px", width: "100%" }}>
            <FormControl
              placeholder="Escribe el nombre"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { search(); } }}
              disabled={loading}
              style={{
                height: "2rem",
                borderRadius: "25px 0 0 25px",
                paddingLeft: "20px",
                fontSize: "16px",
                border: "2px solid #1DB954",
                flex: 1,
              }}
            />
            <Button
              onClick={() => search()}
              disabled={loading || !accessToken}
              style={{
                height: "2.35rem",
                backgroundColor: "#1DB954",
                borderColor: "#1DB954",
                borderRadius: "0 25px 25px 0",
                fontWeight: "bold",
                fontSize: "16px",
                border: "2px solid #1DB954",
              }}
            >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Buscando...
              </>
            ) : (
              "Buscar"
            )}
            </Button>
          </div>
        </div>        {/* MOSTRAR ERRORES */}
        {error && (
          <Alert variant="danger" onClose={() => setError("")} dismissible className="mt-4">
            {error}
          </Alert>
        )}
      </Container>

      {/* INFORMACIÓN DEL ARTISTA */}
      {artist && !loading && (
        <Container className="mb-5">
          <div
            style={{
              marginTop: "30px",
              background: "linear-gradient(135deg, #1DB954 0%, #191414 100%)",
              color: "white",
              padding: "40px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <img
              src={artist.image}
              alt={artist.name}
              style={{
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                marginBottom: "20px",
                border: "4px solid white",
              }}
            />
            <h2 style={{ fontSize: "2.5em", marginBottom: "10px", fontWeight: "bold" }}>
              {artist.name}
            </h2>
            <p style={{ fontSize: "1.1em", marginBottom: "15px" }}>
              📊 {artist.followers.toLocaleString()} seguidores
            </p>
            {artist.genres.length > 0 && (
              <p style={{ fontSize: "1em", marginBottom: "15px" }}>
                🎸 Géneros: <strong>{artist.genres.join(", ")}</strong>
              </p>
            )}
            <a
              href={artist.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                backgroundColor: "white",
                color: "#1DB954",
                padding: "10px 25px",
                borderRadius: "25px",
                textDecoration: "none",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              Ver en Spotify
            </a>
          </div>
        </Container>
      )}

      {/* LISTA DE ÁLBUMES */}
      {albums.length > 0 && !loading && (
        <Container className="mb-5" style={{ paddingLeft: "20px", paddingRight: "20px" }}>
          <h3 style={{ marginBottom: "30px", fontSize: "2em", fontWeight: "bold", color: "#1DB954" }}>
            Álbumes ({albums.length})
          </h3>
          <Row style={{ gap: "20px", display: "flex", flexWrap: "wrap", justifyContent: "flex-start" }}>
            {albums.map((album) => (
              <div
                key={album.id}
                style={{
                  flex: "0 1 calc(20% - 15px)",
                  minWidth: "200px",
                  padding: "30px",
                  marginBottom: "20px",
                }}
              >
                <Card
                  style={{
                    backgroundColor: "white",
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    cursor: "pointer",
                    height: "80%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onClick={() => handleAlbumClick(album)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-10px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(29, 185, 84, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
                  }}
                >
                  <div style={{ position: "relative", overflow: "hidden" }}>
                    <Card.Img
                      variant="top"
                      src={album.images[0]?.url || "https://via.placeholder.com/300"}
                      alt={album.name}
                      style={{
                        height: "140px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <Card.Body style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Card.Title
                      style={{
                        fontSize: "0.95em",
                        fontWeight: "bold",
                        color: "#191414",
                        marginBottom: "0px",
                        minHeight: "40px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {album.name}
                    </Card.Title>

                    <p style={{ color: "#666", marginBottom: "1px", fontSize: "0.85em" }}>
                      📅 {new Date(album.release_date).toLocaleDateString("es-ES")}
                    </p>

                    <p style={{ color: "#666", marginBottom: "8px", fontSize: "0.85em" }}>
                      🎶 {album.total_tracks} canciones
                    </p>

                    <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
                      <a
                        href={album.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          width: "90%",
                          backgroundColor: "#1DB954",
                          color: "white",
                          padding: "10px",
                          borderRadius: "5px",
                          textAlign: "center",
                          textDecoration: "none",
                          fontWeight: "bold",
                          transition: "background-color 0.3s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#1ed760";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#1DB954";
                        }}
                      >
                        Ver en Spotify
                      </a>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </Row>
        </Container>
      )}

      {/* VISTA DETALLADA DEL ÁLBUM */}
      {selectedAlbum && !loading && (
        <Container className="mb-5">
          <Button
            onClick={handleBackToAlbums}
            style={{
              backgroundColor: "#1DB954",
              borderColor: "#1DB954",
              marginBottom: "30px",
              fontWeight: "bold",
            }}
          >
            ← Volver a Álbumes
          </Button>

          <div
            style={{
              background: "linear-gradient(135deg, #1DB954 0%, #191414 100%)",
              color: "white",
              padding: "40px",
              borderRadius: "15px",
              marginBottom: "30px",
              display: "flex",
              alignItems: "center",
              gap: "30px",
            }}
          >
            <img
              src={selectedAlbum.images[0]?.url || "https://via.placeholder.com/300"}
              alt={selectedAlbum.name}
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "4px solid white",
              }}
            />
            <div>
              <h2 style={{ fontSize: "2.5em", marginBottom: "10px", fontWeight: "bold" }}>
                {selectedAlbum.name}
              </h2>
              <p style={{ fontSize: "1.1em", marginBottom: "10px" }}>
                Artista: <strong>{artist?.name}</strong>
              </p>
              <p style={{ fontSize: "1.1em", marginBottom: "10px" }}>
                📅 {new Date(selectedAlbum.release_date).toLocaleDateString("es-ES")}
              </p>
              <p style={{ fontSize: "1.1em" }}>
                🎶 {selectedAlbum.total_tracks} canciones
              </p>
            </div>
          </div>

          {/* LISTA DE CANCIONES */}
          <h3 style={{ marginBottom: "20px", fontSize: "2em", fontWeight: "bold", color: "#1DB954" }}>
            Canciones ({tracks.length})
          </h3>

          {loadingTracks ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Spinner
                animation="border"
                role="status"
                style={{ color: "#1DB954", width: "60px", height: "60px" }}
              >
                <span className="visually-hidden">Cargando canciones...</span>
              </Spinner>
            </div>
          ) : (
            <div>
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "15px",
                    marginBottom: "10px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "10px",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#efefef";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                >
                  <span
                    style={{
                      marginRight: "15px",
                      fontSize: "0.9em",
                      color: "#666",
                      minWidth: "30px",
                      fontWeight: "bold",
                    }}
                  >
                    {index + 1}.
                  </span>

                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: "0 0 5px 0",
                        fontSize: "1em",
                        fontWeight: "bold",
                        color: "#191414",
                      }}
                    >
                      {track.name}
                    </p>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "0.9em",
                        color: "#666",
                      }}
                    >
                      {track.artists.map((artist) => artist.name).join(", ")}
                    </p>
                  </div>

                  <div style={{ marginRight: "15px", color: "#666" }}>
                    {Math.floor(track.duration_ms / 60000)}:
                    {String((track.duration_ms % 60000) / 1000).padStart(2, "0")}
                  </div>

                  {track.preview_url ? (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <Button
                        onClick={() =>
                          document.getElementById(`audio-${track.id}`)?.play()
                        }
                        style={{
                          backgroundColor: "#1DB954",
                          borderColor: "#1DB954",
                          padding: "8px 15px",
                          fontSize: "0.9em",
                          fontWeight: "bold",
                        }}
                      >
                        ▶ Escuchar
                      </Button>
                      <audio
                        id={`audio-${track.id}`}
                        src={track.preview_url}
                        style={{ display: "none" }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.9em", color: "#999" }}>
                      Sin preview
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Container>
      )}

      {/* MENSAJE SIN RESULTADOS */}
      {searched && albums.length === 0 && !loading && !error && (
        <Container style={{ textAlign: "center", marginTop: "50px", marginBottom: "50px" }}>
          <p style={{ fontSize: "1.5em", color: "#999" }}>
            No hay álbumes disponibles para este artista.
          </p>
        </Container>
      )}

      {/* LOADING STATE */}
      {loading && (
        <Container style={{ textAlign: "center", marginTop: "80px", marginBottom: "80px" }}>
          <Spinner
            animation="border"
            role="status"
            style={{ color: "#1DB954", width: "60px", height: "60px" }}
          >
            <span className="visually-hidden">Buscando...</span>
          </Spinner>
          <p style={{ marginTop: "20px", fontSize: "1.2em", color: "#666" }}>
            Buscando artista y álbumes...
          </p>
        </Container>
      )}
    </>
  );
}

export default App;

