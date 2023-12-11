import '../components/LoanApplicationPage.css'
import Service from "../services/Service.js";
import React, { useState } from 'react';
const LoanApplicationPage = () => {
  const [isSuccess, setIsSuccess] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const result = await Service.applyLoan();
      setIsSuccess(result);
      // Display success toast message
    } catch (error) {
      setIsSuccess(false);
      // Display failure toast message
    }
    setTimeout(() => setIsSuccess(null), 10000);

  };
  return (
      <div className={'component-box'}>
        <h2>Loan Application</h2>

        {isSuccess && <div className="toast">Loan Application Successful!</div>}
        {isSuccess === false && <div className="toast">Loan Application Failed.</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="currency">Currency</label>
          <select id="currency">
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
            <option value="ETH">ETH</option>
            {/* Add more currency options as needed */}
          </select>

          <label htmlFor="amount">Amount</label>
          <input id="amount" type="number" placeholder="Enter amount" />

          <label htmlFor="maturityPeriod">Maturity Period (weeks)</label>
          <input id="maturityPeriod" type="number" placeholder="Enter maturity period" />

          <label htmlFor="interestRate">Interest Rate (%)</label>
          <input id="interestRate" type="number" placeholder="Enter interest rate" />

          <label htmlFor="borrowerAddress">Borrower Address</label>
          <input id="borrowerAddress" type="text" disabled placeholder="Borrower's Address" />

          <label htmlFor="lenderAddress">Lender Address</label>
          <input id="lenderAddress" type="text" placeholder="Enter lender's address" />

          <label htmlFor="masterChain">Master Chain</label>
          <select id="masterChain">
            <option value="Ethereum">Ethereum</option>
            <option value="Polygon">Polygon</option>
            <option value="Avalanche">Avalanche</option>
            {/* Add more master chain options as needed */}
          </select>

          <label htmlFor="executionChain">Execution Chain</label>
          <select id="executionChain">
            <option value="Ethereum">Ethereum</option>
            <option value="Polygon">Polygon</option>
            <option value="Avalanche">Avalanche</option>
            {/* Add more execution chain options as needed */}
          </select>

          <button type="submit">Apply Loan</button>
        </form>

      </div>
  );
};

export default LoanApplicationPage;
