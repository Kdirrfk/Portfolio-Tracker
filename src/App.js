import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale } from "chart.js";
import "./App.css";

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale);

const StockDashboard = () => {
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState({
    name: "",
    ticker: "",
    quantity: "",
    buyPrice: "",
  });
  const [editStock, setEditStock] = useState(null);  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalValue: 0,
    topStock: null,
    portfolioDistribution: [],
  });
  const [isMetricsLoading, setIsMetricsLoading] = useState(true); 

  // Fetch stock data
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await axios.get("http://localhost:5000/stocks");
        if (Array.isArray(response.data)) {
          setStocks(response.data);
          fetchPortfolioMetrics(response.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (error) {
        console.error("Error fetching stocks:", error);
        setError("Failed to fetch stock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const fetchPortfolioMetrics = (stocks) => {
    setIsMetricsLoading(true);
    if (stocks.length > 0) {
      const validStocks = stocks.filter(
        (stock) => stock.current_price > 0 && stock.quantity > 0
      );

      const totalValue = validStocks.reduce(
        (acc, stock) => acc + stock.current_price * stock.quantity,
        0
      );

      const topStock = validStocks.reduce((top, stock) =>
        !top || stock.current_price > top.current_price ? stock : top
      , null);

      const portfolioDistribution = validStocks.map((stock) => ({
        ...stock,
        percentage: (stock.current_price * stock.quantity / totalValue) * 100,
      }));

      setPortfolioMetrics({
        totalValue,
        topStock,
        portfolioDistribution,
      });
    } else {
      setPortfolioMetrics(null);
    }
    setIsMetricsLoading(false); 
  };

  
  const pieChartData = useMemo(() => {
    if (portfolioMetrics && portfolioMetrics.portfolioDistribution.length > 0) {
      return {
        labels: portfolioMetrics.portfolioDistribution.map((stock) => stock.name),
        datasets: [
          {
            data: portfolioMetrics.portfolioDistribution.map((stock) => stock.percentage),
            backgroundColor: portfolioMetrics.portfolioDistribution.map(() =>
              `hsl(${Math.random() * 360}, 70%, 60%)`
            ),
            hoverOffset: 4,
          },
        ],
      };
    }
    return {};
  }, [portfolioMetrics]);


  const handleAddStock = async () => {
    if (!newStock.name || !newStock.ticker || !newStock.quantity || !newStock.buyPrice) {
      setError("Please fill in all fields.");
      return;
    }
    if (newStock.quantity <= 0 || newStock.buyPrice <= 0) {
      setError("Quantity and Buy Price must be positive numbers.");
      return;
    }

    try {
      const stockWithPrice = { ...newStock, current_price: null };
      const response = await axios.post("http://localhost:5000/stocks", stockWithPrice);
      setStocks([...stocks, response.data]);
      setNewStock({ name: "", ticker: "", quantity: "", buyPrice: "" });
      setError(null);
      fetchPortfolioMetrics([...stocks, response.data]);
    } catch (error) {
      console.error("Error adding stock:", error);
      setError("Failed to add stock.");
    }
  };

  
  const handleEditStock = (stock) => {
    setEditStock({ ...stock });
  };


  const handleEditChange = (e) => {
    setEditStock({ ...editStock, [e.target.name]: e.target.value });
  };

  
  const handleSaveEdit = async () => {
    if (!editStock || !editStock.name || !editStock.ticker || !editStock.quantity || !editStock.buyPrice) {
      setError("Please fill in all fields.");
      return;
    }
    if (editStock.quantity <= 0 || editStock.buyPrice <= 0) {
      setError("Quantity and Buy Price must be positive numbers.");
      return;
    }

    try {
      const response = await axios.put(`http://localhost:5000/stocks/${editStock.id}`, editStock);
      setStocks(
        stocks.map((stock) =>
          stock.id === editStock.id ? { ...response.data } : stock
        )
      );
      setEditStock(null); 
      fetchPortfolioMetrics(stocks);
    } catch (error) {
      console.error("Error updating stock:", error);
      setError("Failed to update stock.");
    }
  };

  
  const handleCancelEdit = () => {
    setEditStock(null); 
  };

  
  const handleDeleteStock = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/stocks/${id}`);
      setStocks(stocks.filter((stock) => stock.id !== id));
      fetchPortfolioMetrics(stocks.filter((stock) => stock.id !== id));
    } catch (error) {
      console.error("Error deleting stock:", error);
      setError("Failed to delete stock.");
    }
  };

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Stock Portfolio Dashboard</h2>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading stocks...</div>
      ) : (
        <>
          <div className="portfolio-metrics">
            <h3>Total Portfolio Value: ${portfolioMetrics.totalValue.toFixed(2) || "N/A"}</h3>
            <h4>Top Performing Stock: {portfolioMetrics.topStock ? `${portfolioMetrics.topStock.name} ($${portfolioMetrics.topStock.current_price})` : "N/A"}</h4>
            <h4>Portfolio Distribution:</h4>
            {isMetricsLoading ? (
              <div>Loading portfolio metrics...</div>
            ) : portfolioMetrics.portfolioDistribution.length > 0 ? (
              <div className="pie-chart-container">
                <Pie data={pieChartData} width={150} height={150} /> {/* Smaller pie chart */}
              </div>
            ) : (
              <p>No stocks in portfolio</p>
            )}
          </div>

          <div className="stocks-container">
            <div className="stock-cards-container">
              {stocks.length > 0 ? (
                stocks.map((stock) => (
                  <div className="stock-card" key={stock.id}>
                    <h3>{stock.name}</h3>
                    <p>Ticker: {stock.ticker}</p>
                    <p>Quantity: {stock.quantity}</p>
                    <p>Buy Price: ${stock.buyPrice}</p>
                    <p>Current Price: ${stock.current_price || "Fetching..."}</p>

                    <div className="card-actions">
                      {editStock?.id === stock.id ? (
                        <>
                          <button onClick={handleSaveEdit} className="action-button save-button">
                            Save
                          </button>
                          <button onClick={handleCancelEdit} className="action-button cancel-button">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditStock(stock)}
                            className="action-button edit-button"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStock(stock.id)}
                            className="action-button delete-button"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div>No stocks available.</div>
              )}
            </div>

            <div className="add-stock-form-container">
              <div className="add-stock-form">
                <h3>{editStock ? "Edit Stock" : "Add New Stock"}</h3>
                <input
                  type="text"
                  name="name"
                  placeholder="Stock Name"
                  value={editStock ? editStock.name : newStock.name}
                  onChange={editStock ? handleEditChange : (e) => setNewStock({ ...newStock, name: e.target.value })}
                />
                <input
                  type="text"
                  name="ticker"
                  placeholder="Ticker Symbol"
                  value={editStock ? editStock.ticker : newStock.ticker}
                  onChange={editStock ? handleEditChange : (e) => setNewStock({ ...newStock, ticker: e.target.value })}
                />
                <input
                  type="number"
                  name="quantity"
                  placeholder="Quantity"
                  value={editStock ? editStock.quantity : newStock.quantity}
                  onChange={editStock ? handleEditChange : (e) => setNewStock({ ...newStock, quantity: e.target.value })}
                />
                <input
                  type="number"
                  name="buyPrice"
                  placeholder="Buy Price"
                  value={editStock ? editStock.buyPrice : newStock.buyPrice}
                  onChange={editStock ? handleEditChange : (e) => setNewStock({ ...newStock, buyPrice: e.target.value })}
                />
                <button onClick={editStock ? handleSaveEdit : handleAddStock}>
                  {editStock ? "Save Changes" : "Add Stock"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StockDashboard;
