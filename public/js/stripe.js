/*eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
export const bookTour = async (tourId) => {
  //get the checkout session from API
  try {
    const stripe = Stripe(
      'pk_test_51IHNiJBRuLrQXYb8nOayFHP9Y2ndffCB26rlF4vkeXLQOX584CPgd8phEqYzcjINIdTB9WK5he6HeqQnjuXU8xZR001ioQDdzo'
    );
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    //console.log(session);
    //create checkout form +charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    // console.log(err);
    showAlert('error', err);
  }
};
