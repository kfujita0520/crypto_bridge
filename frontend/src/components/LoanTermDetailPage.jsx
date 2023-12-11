import React, {useState, useEffect} from 'react';
import Service from "../services/Service.js";
import '../components/LoanTermDetailPage.css';

const LoanTermDetailPage = () => {
  const [termDetails, setTermDetails] = useState({});
  const [statusDetails, setStatusDetails] = useState({});
  const [userRole, setUserRole] = useState('');
  const [loanStatus, setLoanStatus] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const terms = await Service.getTermDetails();
      const statusDetails = await Service.getStatusDetails();
      const role = await Service.getRole();
      const status = await Service.getStatus();

      console.log(terms);
      console.log(statusDetails);
      console.log(role);
      console.log(status);

      setTermDetails(terms);
      setStatusDetails(statusDetails);
      setUserRole(role);
      setLoanStatus(status);
    };

    fetchData();
  }, []);

  const handleAction = async (actionFunction) => {
    try {
      const result = await actionFunction();
      if (result) {
        setToast({message: 'Action successful!', type: 'success'});
        setTimeout(() => setToast(null), 8000);
      }
    } catch (error) {
      setToast({message: 'Action failed.', type: 'error'});
      setTimeout(() => setToast(null), 8000);
    }
  };

  const renderActionButton = (actionFunction, actionKey, key) => {
    const buttonText = actionButtonLabels[actionKey] || actionKey;
    return <button key={key} onClick={() => handleAction(actionFunction)}>{buttonText}</button>;
  };

  const actionConfig = {
    Borrower: {
      Created: ['depositCollateral'],
      Activated: ['startBorrowing', 'cancelBorrowing'],
      Started: ['redeemPrincipalInPart', 'redeemPrincipalInFull'],
      // Add other statuses as needed
    },
    Lender: {
      Created: ['approveLoanTerm'],
      Started: ['claimInterest', 'claimPrincipal'],
      Redeemed: ['claimPrincipal'],
      // Add other statuses as needed
    },
    Admin: {
      Liquidated: ['liquidateCollateral']
      // Add other statuses as needed
    }
  };

  const actionButtonLabels = {
    depositCollateral: "Deposit Collateral",
    startBorrowing: "Start Borrowing",
    cancelBorrowing: "Cancel Borrowing",
    redeemPrincipalInPart: "Redeem Principal in Part",
    redeemPrincipalInFull: "Redeem Principal in Full",
    approveLoanTerm: "Approve Loan Term",
    claimInterest: "Claim Interest",
    claimPrincipal: "Claim Principal",
    lend: "Lend",
    liquidateCollateral: "Liquidate Collateral"
    // ... add other actions here
  };

  return (
      <div className={'component-box'}>
        {termDetails && (
            <div className="term-detail">
              <h3>Term Detail</h3>
              <p>Currency: {termDetails.currency}</p>
              <p>Amount: {termDetails.amount}</p>
              <p>Maturity Period: {termDetails.maturityPeriod} weeks</p>
              <p>Start Date: {termDetails.startDate}</p>
              <p>Maturity Date: {termDetails.maturityDate}</p>
              <p>Interest Rate: {termDetails.interestRate}%</p>
              <p>Collateral: NFT({termDetails.collateral && termDetails.collateral.owner}, {termDetails.collateral && termDetails.collateral.tokenId})</p>
              <p>Borrower: {termDetails.borrower}</p>
              <p>Lender: {termDetails.lender}</p>
            </div>
        )}
        {statusDetails && (
            <div className="status-detail">
              <h3>Status Detail</h3>
              <p>Status: {statusDetails.status}</p>
              <p>Paid Interest by Lender: {statusDetails.paidInterestByLender}</p>
              <p>Claimed Interest by Borrower: {statusDetails.claimedInterestByBorrower}</p>
              <p>Claimable Interest: {statusDetails.claimableInterest}</p>
              <p>Withdrawable Principal: {statusDetails.withdrawablePrincipal}</p>
            </div>
        )}

        {userRole in actionConfig && loanStatus in actionConfig[userRole] &&
            actionConfig[userRole][loanStatus].map((action, index) =>
                renderActionButton(Service[action], action, action + index)
            )
        }
        {/* ... */}
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
  );
};

export default LoanTermDetailPage;
