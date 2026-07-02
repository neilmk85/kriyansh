import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Star, CheckCircle, ExternalLink } from 'lucide-react'

const API = ''

export default function CustomerReview() {
  const { token } = useParams()
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['review-page', token],
    queryFn: () => axios.get(`${API}/api/public/review/${token}`).then(r => r.data),
  })

  const submitMutation = useMutation({
    mutationFn: () => axios.post(`${API}/api/public/review/${token}`, { rating: selected, comment }),
    onSuccess: (res) => {
      setResult(res.data)
      setSubmitted(true)
    },
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-50">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
        <p className="text-gray-500 text-sm">This review link is no longer valid.</p>
      </div>
    </div>
  )

  if (page?.already_submitted || submitted) {
    const rating = result?.rating ?? page?.existing_rating ?? 0
    const isHighRater = rating >= 4
    const yelpURL = result?.yelp_url ?? ''
    const googleURL = result?.google_review_url ?? ''

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
          {isHighRater ? (
            <>
              <p className="text-gray-500 text-sm mb-6">
                We're thrilled you had a great experience! Would you mind sharing it on:
              </p>
              <div className="space-y-3">
                {yelpURL && (
                  <a href={yelpURL} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#d32323] text-white font-semibold text-sm hover:bg-[#b51d1d] transition-colors">
                    <ExternalLink size={15} /> Leave a Yelp Review
                  </a>
                )}
                {googleURL && (
                  <a href={googleURL} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#4285F4] text-white font-semibold text-sm hover:bg-[#2b6fdb] transition-colors">
                    <ExternalLink size={15} /> Leave a Google Review
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm">
              Your feedback has been shared with the team. We'll use it to improve your next visit!
            </p>
          )}
        </div>
      </div>
    )
  }

  const displayStars = hovered || selected

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        {/* Salon branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">
              {page?.salon_name?.[0] ?? 'K'}
            </span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">{page?.salon_name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hi {page?.client_name?.split(' ')[0]}! How was your visit?
          </p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(n)}
              className="transition-transform hover:scale-110 focus:outline-none">
              <Star size={40}
                className={`transition-colors ${n <= displayStars ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
              />
            </button>
          ))}
        </div>

        {/* Rating label */}
        <p className="text-center text-sm font-medium text-gray-500 h-5 mb-4">
          {displayStars === 1 ? 'Poor' :
           displayStars === 2 ? 'Fair' :
           displayStars === 3 ? 'Good' :
           displayStars === 4 ? 'Great' :
           displayStars === 5 ? 'Excellent!' : ''}
        </p>

        {/* Comment (shown once a star is selected) */}
        {selected > 0 && (
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us more (optional)…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300 mb-4"
          />
        )}

        <button
          disabled={selected === 0 || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
          {submitMutation.isPending ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}
