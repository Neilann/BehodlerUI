import * as React from 'react';
import './App.css';
import LayoutFrame from './components/LayoutFrame/index'
import { createMuiTheme, makeStyles } from '@material-ui/core';
import { ThemeProvider, createStyles } from '@material-ui/styles';
import { WalletContextProvider } from './components/Contexts/WalletStatusContext'
import { BrowserRouter, withRouter } from 'react-router-dom'

const theme = createMuiTheme({
	palette: {
		type: 'light'
	},
	typography: {
		//fontFamily: 'Syncopate',
		//fontSize:11
	}
})

const backStyles = makeStyles(theme => createStyles({
	root: {
	height:'100%',
	position:'absolute',
	bottom:0,
	width:'100%',
	overflowY:'hidden'	
	}
}))

export default function App() {
	const classes = backStyles()
	const RoutedApp = withRouter(() => {
		return (
			<WalletContextProvider>
				<ThemeProvider theme={theme}>
					<div className={classes.root}>
						<LayoutFrame />
					</div>
				</ThemeProvider>
			</WalletContextProvider>
		);
	})
	return <BrowserRouter> <RoutedApp /></BrowserRouter>

}

