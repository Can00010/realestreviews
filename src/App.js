import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Paper from '@mui/material/Paper';

function ReviewVotes({ reviewId }) {
  const [votes, setVotes] = useState({});

  useEffect(() => {
    fetch(`http://localhost:5000/api/review_votes/${reviewId}`)
      .then(res => res.json())
      .then(setVotes);
  }, [reviewId]);

  const handleVote = (type) => {
    fetch('http://localhost:5000/api/review_votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        review_id: reviewId,
        vote_type: type,
        voter: "testuser"
      })
    })
      .then(res => res.json())
      .then(result => {
        if (result.status === 'already_voted') {
          alert("You have already voted on this review.");
        }
        // Optionally refresh votes here
      });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Button variant="outlined" size="small" onClick={() => handleVote('helpful')}>👍 Helpful ({votes.helpful || 0})</Button>
      <Button variant="outlined" size="small" sx={{ ml: 1 }} onClick={() => handleVote('funny')}>😂 Funny ({votes.funny || 0})</Button>
      <Button variant="outlined" size="small" sx={{ ml: 1 }} onClick={() => handleVote('unhelpful')}>👎 Unhelpful ({votes.unhelpful || 0})</Button>
    </Box>
  );
}

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [media, setMedia] = useState([]);
  const [reviews, setReviews] = useState({});
  const [showReviewsFor, setShowReviewsFor] = useState(null);
  const [reviewForm, setReviewForm] = useState({});

  const [averageRatings, setAverageRatings] = useState({});
  const [topKeywords, setTopKeywords] = useState({});

  useEffect(() => {
    fetch('http://localhost:5000/api/media')
      .then(res => res.json())
      .then(data => setMedia(data.media));
  }, []);

  const fetchReviews = (media_id) => {
    if (showReviewsFor === media_id) {
      setShowReviewsFor(null);
      return;
    }
    fetch(`http://localhost:5000/api/reviews?media_id=${media_id}`)
      .then(res => res.json())
      .then(data => setReviews(prev => ({ ...prev, [media_id]: data.reviews })));
    setShowReviewsFor(media_id);
  };

  useEffect(() => {
    if (media.length === 0) return;

    media.forEach(item => {
      fetch(`http://localhost:5000/api/reviews?media_id=${item.id}`)
        .then(res => res.json())
        .then(data => {
          const reviewsList = data.reviews || [];
          if (reviewsList.length === 0) {
            setAverageRatings(prev => ({ ...prev, [item.id]: null }));
            setTopKeywords(prev => ({ ...prev, [item.id]: null }));
            return;
          }

          const avg = reviewsList.reduce((sum, r) => sum + Number(r.overall_score), 0) / reviewsList.length;
          setAverageRatings(prev => ({ ...prev, [item.id]: avg.toFixed(1) }));

          const maxScore = Math.max(...reviewsList.map(r => Number(r.overall_score)));
          const topReviews = reviewsList.filter(r => Number(r.overall_score) === maxScore);

          const keywordCount = {};
          topReviews.forEach(r => {
            if (r.keywords) {
              r.keywords.split(',').map(k => k.trim().toLowerCase()).forEach(k => {
                if (k) keywordCount[k] = (keywordCount[k] || 0) + 1;
              });
            }
          });

          let mostCommonKeyword = null;
          let highestCount = 0;
          for (const [keyword, count] of Object.entries(keywordCount)) {
            if (count > highestCount) {
              mostCommonKeyword = keyword;
              highestCount = count;
            }
          }

          setTopKeywords(prev => ({ ...prev, [item.id]: mostCommonKeyword }));
        });
    });
  }, [media]);

  const handleFormChange = (media_id, field, value) => {
    setReviewForm(prev => ({
      ...prev,
      [media_id]: { ...prev[media_id], [field]: value }
    }));
  };

  const handleReviewSubmit = (media_id) => {
    const form = reviewForm[media_id] || {};

    const categories = ['Story', 'Characters', 'Graphics', 'Soundtrack'].map(cat => ({
      category: cat,
      score: Number(form[cat] || 5)
    }));

    const avg = categories.reduce((sum, c) => sum + c.score, 0) / categories.length;

    const reviewData = {
      media_id,
      username: form.username || 'Anonymous',
      overall_score: avg.toFixed(1),
      keywords: form.keywords || '',
      review_text: form.review_text || '',
      categories
    };

    fetch('http://localhost:5000/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    })
      .then(res => res.json())
      .then(() => {
        fetchReviews(media_id);
        setReviewForm(prev => ({ ...prev, [media_id]: {} }));
      });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#121212', color: 'white', padding: 3, fontFamily: 'sans-serif' }}>
      <Typography variant="h3" gutterBottom sx={{ color: 'white', textAlign: 'center' }}>
        Media List
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <TextField
          type="text"
          placeholder="Search media..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{
            width: "60%",
            backgroundColor: 'white',
            borderRadius: 1,
          }}
        />
      </Box>

      <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
        {media
          .filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.creator && item.creator.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.type && item.type.toLowerCase().includes(searchTerm.toLowerCase()))
          )
          .map(item => (
            <li key={item.id} style={{ marginBottom: 16 }}>
              <Paper
                elevation={6}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#2e2e2e',
                  borderRadius: 3,
                  color: 'white',
                  border: '1.5px solid #555',
                  boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.05)',
                }}
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: 'cover',
                      marginRight: 16,
                      borderRadius: 8,
                      boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)',
                    }}
                  />
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" component="div" sx={{ color: 'white' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, color: '#ccc' }}>
                    Type: {item.type} | Creator: {item.creator} | Release: {item.release_date}
                  </Typography>

                  {averageRatings[item.id] && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      ⭐ Average Rating: {averageRatings[item.id]}
                    </Typography>
                  )}
                  {topKeywords[item.id] && (
                    <Typography variant="body2" sx={{ mb: 1, color: '#bbb' }}>
                      🔑 Top Keyword: {topKeywords[item.id]}
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    sx={{ mt: 1, backgroundColor: '#333', '&:hover': { backgroundColor: '#555' } }}
                    onClick={() => fetchReviews(item.id)}
                  >
                    {showReviewsFor === item.id ? "Hide Reviews" : "Show Reviews"}
                  </Button>

                  {showReviewsFor === item.id && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h5" gutterBottom>
                        Write a Review
                      </Typography>

                      <TextField
                        placeholder="Username"
                        value={reviewForm[item.id]?.username || ''}
                        onChange={e => handleFormChange(item.id, 'username', e.target.value)}
                        sx={{ mr: 1, mb: 1, backgroundColor: '#000', borderRadius: 1, input: { color: '#fff' } }}
                      />
                      <TextField
                        placeholder="Keywords (optional)"
                        value={reviewForm[item.id]?.keywords || ''}
                        onChange={e => handleFormChange(item.id, 'keywords', e.target.value)}
                        sx={{ mr: 1, mb: 2, backgroundColor: '#000', borderRadius: 1, input: { color: '#fff' } }}
                      />
                      <TextField
                        multiline
                        placeholder="Your review"
                        value={reviewForm[item.id]?.review_text || ''}
                        onChange={e => handleFormChange(item.id, 'review_text', e.target.value)}
                        sx={{ width: "90%", mb: 2, backgroundColor: '#000', borderRadius: 1, textarea: { color: '#fff' } }}
                        rows={4}
                      />
                      {['Story', 'Characters', 'Graphics', 'Soundtrack'].map(category => (
                        <Box key={category} sx={{ mb: 2 }}>
                          <Typography gutterBottom>
                            {category}: {reviewForm[item.id]?.[category] || 5}/10
                          </Typography>
                          <Slider
                            aria-label={category}
                            min={1}
                            max={10}
                            value={reviewForm[item.id]?.[category] || 5}
                            onChange={(e, val) => handleFormChange(item.id, category, val)}
                            sx={{ width: 120 }}
                          />
                        </Box>
                      ))}

                      <Button variant="contained" onClick={() => handleReviewSubmit(item.id)}>
                        Submit Review
                      </Button>

                      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                        Reviews
                      </Typography>
                      {reviews[item.id] && (reviews[item.id].length === 0 ? (
                        <Typography>No reviews yet.</Typography>
                      ) : (
                        reviews[item.id].map(r => (
                          <Paper
                            key={r.id}
                            elevation={1}
                            sx={{
                              mb: 2,
                              p: 2,
                              backgroundColor: '#000',
                              color: '#fff',
                              borderRadius: 2,
                              border: '1.5px solid #555',
                            }}
                          >
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#fff' }}>
                              {r.username}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc' }}>
                              {r.overall_score}/10
                            </Typography>
                            {r.keywords && (
                              <Typography variant="body2" sx={{ color: '#aaa', fontStyle: 'italic' }}>
                                Keywords: {r.keywords}
                              </Typography>
                            )}
                            <Typography variant="body1" sx={{ mt: 1, color: '#eee' }}>
                              {r.review_text}
                            </Typography>
                            <ul style={{ color: '#ccc' }}>
                              {r.categories.map(cat => (
                                <li key={cat.category}>
                                  {cat.category}: {cat.score}/10
                                </li>
                              ))}
                            </ul>
                            <Box sx={{ my: 1 }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: '#fff' }}>
                                👍 Helpful: {r.helpful_votes}
                              </Typography>
                            </Box>
                            <ReviewVotes reviewId={r.id} />
                          </Paper>
                        ))
                      ))}
                        </Box>
                      )}
                    </Box>
                </Paper>
              </li>
            ))}
      </ul>
    </Box>
  );
}

export default App;